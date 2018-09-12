import {Injectable} from "@angular/core";
import {Message} from "./message";
import {Store} from "../data/store";
import {QueueType} from "../data/queuetype";
import {Mode} from "./mode";
import {
  CONTENTFLY_SYNC_START, CONTENTFLY_SYNC_SUCCESS,
  ENTITIES_TO_EXCLUDE,
  SYNC_CHUNK_SIZE
} from "../constants";
import {Schema} from "../data/schema";
import {SyncState} from "./syncstate";
import {Api} from "../api/api";
import {Logger} from "../helper/logger";
import {File} from "@ionic-native/file";
import {Uploader} from "./uploader";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import {Events} from "ionic-angular";


@Injectable()
export class Service {

  private api : Api = null;
  private currentDataCount : number         = 0;
  private dataCount : number                = 0;
  private data : BehaviorSubject<Message>   = null;
  private isSyncing : boolean               = false;

  constructor(private events : Events, private file : File, private logger : Logger, private schema : Schema, private store : Store, private syncState : SyncState, private uploader : Uploader) {

  }

  /**
   * Gibt den Synchronisations-Prozess zurück
   * @returns {Observable<Message>}
   */
  private getData() {
    return this.data.asObservable();
  }

  /**
   * Setzt das API-Projekt, wird benötigt um die Method sync() aufzurufen
   * @param {Api} api
   */
  public setApi(api : Api){
    this.api = api;
  }

  /**
   * Startet den Synchronisations-Projekt
   * @returns {Observable<Message>}
   */
  public sync(){
    if(!this.isSyncing){
      this.startSync();
    }

    return this.getData();
  }

  /**
   * Startet die Synchronisation der Dateien
   * @returns {Promise<any[]>}
   */
  private syncFiles(){
    return this.store.query('SELECT id, name, hash, _hashLocal, type, size FROM pim_file WHERE _hashLocal IS NULL OR hash != _hashLocal', []).then((files) => {
      //Noch nicht synchronisierte Dateien wurden ermittelt

      if(!files.length){
        return Promise.resolve([]);
      }

      this.dataCount        = files.length;
      this.currentDataCount = 0;

      let allPromises = [];

      this.data.next(new Message(Mode.FROM, 'Dateien werden synchronsiert...', 0, 1, this.dataCount));

      for(let index = 0; index < files.length; index++){
        let file = files[index];

        let p = this.api.file(file['id']).then((blob) => {
          //Binäre Datei/Blob wurde geladen

          return this.file.writeFile(this.file.dataDirectory, file['id'], blob, {replace: true} );
        }).then(() => {
          //Blob wurde lokal gespeichert

          let updateData = {
            'id' : file['id'],
            '_hashLocal' : file['hash']
          };

          return this.store.update('PIM\\File', updateData, true);
        }).then(() => {
          //Datenbank wurde aktualisiert

          this.currentDataCount++;
          let progress = Math.round(this.currentDataCount / this.dataCount * 100);
          this.data.next(new Message(Mode.FROM, 'Dateien werden synchronsiert...', progress, this.currentDataCount, this.dataCount));

          return Promise.resolve();
        }).catch((error) => {
          this.logger.error('[sync.service->syncFiles] api/file', error);
          return Promise.resolve();
        });

        allPromises.push(p);

      }

      return Promise.all(allPromises);
    });
  }

  /**
   * Synchronisiert eine Mulijoin-Entity/-Tabelle
   * @param {string} key
   * @param {string} entityName
   * @param {string} entityProperty
   * @param {string} sourceTableName
   * @param {string} sourceJoinField
   * @param {string} destTableName
   * @param {string} lastSyncDate
   * @param {number} startFromChunk
   * @returns {Promise<any>}
   */
  private syncMultijoinFromEntity(key: string, entityName : string, entityProperty : string, sourceTableName : string, sourceJoinField : string, destTableName: string, lastSyncDate : string, startFromChunk : number){

    var from = {};
    from[sourceTableName] = "src";

    sourceJoinField = sourceJoinField.substr(0, 3) == 'pim' ? sourceJoinField.substr(3) : sourceJoinField;

    let params = {
      "select": "src.*",
      "from": from,
      "innerJoin": ["src", destTableName, "dest", "src." + sourceJoinField + " = dest.id"],
      setMaxResults: SYNC_CHUNK_SIZE,
      setFirstResult: this.syncState.getLastChunkSize(key)
    };

    if(lastSyncDate){
      params['where'] = {'dest.modified > ?' : [lastSyncDate]};
    }


    return this.api.post('query', params).then((request) => {
      //Datensätze seit letzter Synchronisierung wurden ermittelt

      let data: any[] = request['data'] ? request['data'] : [];

      if (data.length > 0) {
        //Datensätze vorhanden und in Datenbank importieren

        var promise = new Promise((resolve, reject) => {

          this.store.importMultijoin(sourceTableName, data).subscribe(
            () => {
              this.currentDataCount++;
              let progress = Math.round(this.currentDataCount / this.dataCount * 100);
              this.data.next(new Message(Mode.FROM, 'Datensätze werden synchronsiert...', progress, this.currentDataCount, this.dataCount));
            },
            (error) => {
              this.logger.error('[sync.service->syncFromEntity] store.import', error);
              resolve();
            },
            () => {
              //Datensätze wurden importiert, nächsten Chunk-Durchlauf anstoßen

              let newStartFromChunK = startFromChunk + SYNC_CHUNK_SIZE;
              this.syncState.setLastChunkSize(key, newStartFromChunK);
              this.syncState.save();

              this.syncMultijoinFromEntity(key, entityName, entityProperty, sourceTableName, sourceJoinField, destTableName, lastSyncDate, newStartFromChunK).then(() => {
                resolve();
              })
            }
          );
        });

        //Rückgabe Promise an ->CODE_SYNCFROM_PARALLEL
        return promise;
      } else {
        //Keine Datensätze vorhanden, Synchronisierung der Entität abschließen

        this.syncState.setLastChunkSize(key, 0);
        this.syncState.setLastSyncDate(key, request['ts']);
        this.syncState.save();

        //Rückgabe Promise an ->CODE_SYNCFROM_PARALLEL
        return Promise.resolve([]);
      }
    }).catch((error) => {
      this.logger.error('[sync.service->syncMultijoinFromEntity] api/query', error);
      return Promise.resolve([]);
    });
  }

  /**
   * Synchronisiert eine Entität
   * @param {string} entityName
   * @param {string} lastSyncDate
   * @param {number} startFromChunk
   * @returns {Promise<any>}
   */
  private syncFromEntity(entityName : string, lastSyncDate : string, startFromChunk : number){

      let params = {
        select: '*',
        from: entityName,
        setMaxResults: SYNC_CHUNK_SIZE,
        setFirstResult: this.syncState.getLastChunkSize(entityName)
      };

      if(lastSyncDate){
        params['where'] = {'modified > ?' : [lastSyncDate]};
      }

      return this.api.post('query', params).then((request) => {
        //Datensätze seit letzter Synchronisierung wurden ermittelt

        let data: any[] = request['data'] ? request['data'] : [];

        if (data.length > 0) {
          //Datensätze vorhanden und in Datenbank importieren

          var promise = new Promise((resolve, reject) => {
            //Todo: Deleted Objects from Entity as Param
            this.store.import(entityName, data).subscribe(
              () => {
                this.currentDataCount++;
                let progress = Math.round(this.currentDataCount / this.dataCount * 100);
                this.data.next(new Message(Mode.FROM, 'Datensätze werden synchronsiert...', progress, this.currentDataCount, this.dataCount));
              },
              (error) => {
                this.logger.error('[sync.service->syncFromEntity] store.import', error);
                resolve();
              },
              () => {
                //Datensätze wurden importiert, nächsten Chunk-Durchlauf anstoßen
                let newStartFromChunK = startFromChunk + SYNC_CHUNK_SIZE;
                this.syncState.setLastChunkSize(entityName, newStartFromChunK);
                this.syncState.save();

                this.syncFromEntity(entityName, lastSyncDate, newStartFromChunK).then(() => {
                  resolve();
                });
              }
            );
          });

          //Rückgabe Promise an ->CODE_SYNCFROM_PARALLEL
          return promise;

        }else{
          //Keine Datensätze vorhanden, Synchronisierung der Entität abschließen

          this.syncState.setLastChunkSize(entityName, 0);
          this.syncState.setLastSyncDate(entityName, request['ts']);
          this.syncState.save();

          //Rückgabe Promise an ->CODE_SYNCFROM_PARALLEL
          return Promise.resolve([]);
        }
      }).catch((error) => {
        this.logger.error('[sync.service->syncFromEntity] api/query', error);
        return Promise.resolve([]);
      });
  }

  /**
   * Startet den Synchronisations-Prozess
   */
  private startSync(){
    this.isSyncing  = true;
    this.events.publish(CONTENTFLY_SYNC_START, null);

    this.startSyncTo().then(() => {
      return this.startSyncFrom();
    }).then(() => {
      this.logger.info('[service.startSyncFrom]', 'finished');
      this.isSyncing = false;
      this.data.complete();
    }).catch((error) => {
      this.logger.error('[service.startSync]', error);
      this.isSyncing = false;
      this.data.complete();
    });
  }

  /**
   * Startet Synchronisations-Prozess vom Server
   * @returns {Promise<void>}
   */
  private startSyncFrom(){
    this.logger.info("[service.startSyncFrom]");

    this.data.next(new Message(Mode.FROM, 'Prüfe Änderungen auf dem Server...'));
    let countParams: {} = {};

    //Lade letzte Synchronisations-Datum zu jeder Entität
    for (let entityName in this.schema.data) {
      if (ENTITIES_TO_EXCLUDE.indexOf(entityName) >= 0) continue;
      if (this.syncState.getLastSyncDate(entityName)) {
        countParams[entityName] = this.syncState.getLastSyncDate(entityName);
      }
    }

    let startPromise  = null;
    let params        = {};

    if (Object.keys(countParams).length) {
      params = {lastModified: countParams};
      startPromise = this.api.post('deleted', params);
    }else{
      startPromise = Promise.resolve(null);
    }

    let countRequest : any   = null;

    return startPromise.then((deletedObjectsFromPromise) => {
      //Gelöschte Objekte wurden ausgelesen, oder beim Start übersprungen

      if(deletedObjectsFromPromise && deletedObjectsFromPromise['data'] && deletedObjectsFromPromise['data'].length > 0){
        this.data.next(new Message(Mode.FROM, 'Datenbank bereinigen...', 0, 0, 0));
        return this.store.deleteObjects(deletedObjectsFromPromise['data']);
      }else{
        return Promise.resolve()
      }
    }).then(() => {
      //Alte Datensätze wurden gelöscht

      return this.api.post('count', params);
    }).then((countRequestFromPromise) => {
      //Anzahl der geänderten Datensätze wurde ermittelt, gegebenenfalls wird Update des Schemas durchgeführt

      countRequest = countRequestFromPromise;

      if (countRequest['hash'] != this.schema.hash) {
        return this.updateSchema();
      } else {
        return Promise.resolve();
      }
    }).then((data) => {
      //Schema-Update wurde durchgeführt, oder nur Anzahl der Datensätze gespeichert

      this.dataCount        = countRequest['data']['dataCount'];
      this.currentDataCount = 0;

      if(this.dataCount == 0){
        this.data.next(new Message(Mode.FROM, 'Keine Änderungen auf dem Server vorhanden.', 0, 0, 0));
        this.logger.info("Keine neuen Daten vorhanden.");
        return Promise.resolve([]);
      }

      let entities : any[] = [];

      //Ermittle zu synchronisierende Entitäten
      for (let entityName in this.schema.data) {
        if(ENTITIES_TO_EXCLUDE.indexOf(entityName) >= 0) continue;

        entities.push({key: entityName, entityName: entityName, isMultijoin: false});

        var entityConfig = this.schema.data[entityName];
        for (let property in entityConfig.properties) {
          var propertyConfig: any = entityConfig.properties[property];
          var type: string = propertyConfig.type;

          switch(type){
            case "multifile":

              var joinedTableName = propertyConfig.foreign ? propertyConfig.foreign :  entityConfig.settings.dbname + "_" + property;

              entities.push({
                key: entityName + '_' + property,
                entityName:entityName,
                entityProperty: property,
                srcTableName: joinedTableName,
                srcJoinField: "file_id",
                destTableName: "pim_file",
                isMultijoin: true
              });

              break;
            case "multijoin":
              if(!propertyConfig.foreign){
                continue;
              }

              entities.push({
                key: entityName + '_' + property,
                entityName:entityName,
                entityProperty: property,
                srcTableName: propertyConfig.foreign,
                srcJoinField: entityConfig.settings.dbname.replace('_', '') + "_id",
                destTableName: entityConfig.settings.dbname,
                isMultijoin: true
              });

              continue;
            default:
              break;
          }
        }

      }

      //[CODE_SYNCFROM_PARALLEL] Parallele Synchronisierung der Datensätze pro Entität
      var allPromises = [];

      if(this.dataCount == 0){
        return Promise.resolve();
      }

      for (let index in entities) {
        var entity = entities[index];
        var key = entity['key'];
        var entityName = entity['entityName'];
        var isMultijoin = entity['isMultijoin'];

        var lastSyncDate = this.syncState.getLastSyncDate(entityName);

        if (!isMultijoin) {
          let startFromChunK = this.syncState.getLastChunkSize(entityName);
          allPromises.push(this.syncFromEntity(entityName, lastSyncDate, startFromChunK));
        } else {
          let startFromChunK = this.syncState.getLastChunkSize(key);

          allPromises.push(this.syncMultijoinFromEntity(key, entityName, entity['entityProperty'], entity['srcTableName'], entity['srcJoinField'], entity['destTableName'], lastSyncDate, startFromChunK));
        }
      }

      return Promise.all(allPromises);

    }).then(() => {
      //Paralle Synchronisierung der Entitäten abgeschlossen

      if(this.dataCount == 0){
        return Promise.resolve();
      }

      return this.syncFiles().then(() => {
        this.data.next(new Message(Mode.FROM, 'Daten wurden erfolgreich synchronisiert.', 0, 0, 0));
        this.events.publish(CONTENTFLY_SYNC_SUCCESS, null);
        return Promise.resolve();
      });
    });

  }

  /**
   * Startet Synchronisations-Prozess zum Server
   * @returns {Promise<any[]>}
   */
  private startSyncTo(){
    this.logger.info("[service.startSyncTo]", "started");
    this.data  = new BehaviorSubject(new Message(Mode.TO, 'Prüfe lokale Änderungen...'));

    let statement = "" +
      "SELECT * " +
      "FROM `queue` " +
      "ORDER BY `entity_id`, `created` DESC";

    return this.store.query(statement, []).then((objects) => {
      //Zu synchronisierende Datensätze wurden ermittelt

      if (!objects || !objects.length) {
        return Promise.resolve([]);
      }

      let objectsToSync: any[] = [];
      let joinedObjectsToSync: {} = {};
      let lastObject: any = null;
      let lastIsInserted: boolean = false;
      let allJoinedObjects: number = 0;


      //Datensätze mit Joins ermitteln und extrahieren
      for (let object of objects) {
        if (lastObject && lastObject.entity_id != object.entity_id) {

          if (lastObject.mode != QueueType.deleted || lastObject.mode == QueueType.deleted && !lastIsInserted) {
            //if(objects.find(x => x.entity_name))
            let joins = JSON.parse(lastObject.joins);
            let joinFound = false;
            if (joins && joins.length > 0) {
              for (let join of joins) {
                if (objects.find(x => x.entity == join.entity_name && x.entity_id == join.entity_id && x.mode == QueueType.inserted)) {
                  joinFound = true;

                  if (!joinedObjectsToSync[join.entity_id]) {
                    joinedObjectsToSync[join.entity_id] = [];
                  }
                  joinedObjectsToSync[join.entity_id].push(lastObject);
                  allJoinedObjects++;
                }
              }

              if (!joinFound) {
                objectsToSync.push(lastObject);
              }
            } else {
              objectsToSync.push(lastObject);
            }
          }
        }
        lastIsInserted = false;
        lastIsInserted = lastIsInserted || object.mode == QueueType.inserted;
        lastObject = object;
      }

      if (lastObject.mode != QueueType.deleted || lastObject.mode == QueueType.deleted && !lastIsInserted) {
        let joins = JSON.parse(lastObject.joins);
        let joinFound = false;
        if (joins && joins.length > 0) {
          for (let join of joins) {
            if (objects.find(x => x.entity == join.entity_name && x.entity_id == join.entity_id && x.mode == QueueType.inserted)) {
              joinFound = true;

              if (!joinedObjectsToSync[join.entity_id]) {
                joinedObjectsToSync[join.entity_id] = [];
              }
              joinedObjectsToSync[join.entity_id].push(lastObject);
              allJoinedObjects++;
            }
          }

          if (!joinFound) {
            objectsToSync.push(lastObject);
          }
        } else {
          objectsToSync.push(lastObject);
        }
      }


      if(!objectsToSync.length){
        return Promise.resolve([]);
      }

      //Hochladen der Datensätze auf den Sever starten
      this.uploader.init(allJoinedObjects + objectsToSync.length, joinedObjectsToSync);
      return this.uploader.start(this.api, objectsToSync).then((data) => {
        this.logger.info("[service.startSyncTo]", "finished");

        let d           = new Date();
        let datestring  = d.getFullYear() + '-' + ("0"+(d.getMonth()+1)).slice(-2) + '-' + ("0" + d.getDate()).slice(-2) + ' ' + ("0" + d.getHours()).slice(-2) + ':' + ("0" + d.getMinutes()).slice(-2) + ':' + ("0" + d.getSeconds()).slice(-2)

        this.syncState.setLastSyncToDate(datestring);
        this.syncState.save();
        return Promise.resolve([]);
      });
    }).catch((error) => {
      this.logger.info('[store.startSyncTo]', error);
    });
  }

  /**
   * Führt ein Schema-Update der Datenbank durch
   * @returns {Promise<void>}
   */
  private updateSchema(){
    return this.api.get('schema').then((schema) => {
      this.schema.update(schema['data']);
      return this.store.updateSchema(this.schema);
    }).then( () => {
      this.schema.save();
      return Promise.resolve();
    });
  }

}