import {Injectable} from "@angular/core";
import {Store} from "../data/store";
import {QueueType} from "../data/queuetype";
import {Api} from "../api/api";
import {Logger} from "../helper/logger";
import {File} from "@ionic-native/file/ngx";

@Injectable()
export class Uploader {

  joinedObjects : {} = {};
  objectsToSyncCount : number = 0;

  constructor(private store : Store, private logger : Logger, private file : File){

  }

  /**
   * Prüfen ob verknüpfte Datensätze zu einem Objekt vorhanden sindobjectsToSync
   * @param {string} id
   * @returns {boolean}
   */
  private checkMultipleJoins(id : string){

    for(let objectIndex in this.joinedObjects[id]){
      let object       = this.joinedObjects[id][objectIndex];

      for(let keyId in this.joinedObjects){
        if(keyId == id) continue;

        for(let subobject of this.joinedObjects[keyId]){
          if(subobject.id == object.id){
            this.joinedObjects[id].splice(objectIndex, 1);
            this.objectsToSyncCount--;
          }
        }
      }
    }

    return this.joinedObjects[id].length > 0;
  }

  /**
   * Stellt Löschabfragen für verknüpfte Datensätze zusammen
   * @param entity_id
   * @param {any[]} statements
   * @returns {any[]}
   */
  private deleteJoinedObjects(entity_id, statements : any[] = []){
    if (this.joinedObjects[entity_id]) {
      for(let index in this.joinedObjects[entity_id]){
        let objectToDelete  = this.joinedObjects[entity_id][index];
        statements.push(["DELETE FROM queue WHERE id = ?", [objectToDelete.id]]);
        this.objectsToSyncCount--;
        if(this.joinedObjects[objectToDelete.entity_id]){
          statements = this.deleteJoinedObjects(objectToDelete.entity_id, statements);
        }
      }
    }

    return statements
  }

  /**
   * Uploader initialisieren
   * @param objectsToSyncCount
   * @param joinedObjects
   */
  public init(objectsToSyncCount, joinedObjects){
    this.joinedObjects = joinedObjects;
    this.objectsToSyncCount = objectsToSyncCount;
  }

  /**
   * Hochladen der zu synchronisierenden Datensätze
   * @param {Api} api
   * @param {any[]} objects
   * @returns {Promise<any[]>}
   */
  public start(api : Api, objects : any[]){
    let promises = [];

    for(let object of objects){

      if(object.mode == QueueType.deleted){
        this.logger.info("[upload.start] delete", object.entity + '/' + object.entity_id);
        let p = api.post('delete', {entity: object.entity, id: object.entity_id}).then(() => {
          return this.store.query('DELETE FROM queue WHERE entity_id = ? ', [object.entity_id]);
        }).catch((error) => {
          this.logger.error('[uploader.start] api->delete', error);

          if(error.status == 404){
            this.store.query('DELETE FROM queue WHERE id = ?', [object.id]).then().catch();
          }

          return Promise.resolve(false);
        });

        promises.push(p);
      } else{
        let objectComplete = null;

        if(object.entity == 'PIM\\File') {
          this.logger.info("[upload.start] file", object.entity + ':' + object.entity_id);
          let p = this.store.single(object.entity, object.entity_id).then((data) => {
            //Details zu Datensatz wurden geladen

            objectComplete = data;
            const type     = data['type'];

            let ext        = '';
            if(type && type.substr(0, 5) == 'image'){
              ext = '.jpg';
            }

            return this.file.readAsArrayBuffer(this.file.dataDirectory, object.entity_id + ext);
          }).then((res) => {
            //Datei wurde als ArryBuffer eingelesen

            try {
              let fileData = new Blob([res], {type: objectComplete.type});

              return api.fileUpload(object.entity_id, objectComplete.name, fileData);
            } catch (error) {
              this.logger.error('[uploader.start] create blob ', error);
              return Promise.reject(error);
            }
          }).then((data) => {
            //Datei wurde hochgeladen

            return this.store.query('DELETE FROM queue WHERE entity_id = ? ', [object.entity_id]);
          }).then((data) => {
            //Datensatz wurde aus Queue gelöscht
     
            if (this.joinedObjects[object.entity_id]) {
              if (this.checkMultipleJoins(object.entity_id)) {
                var newObjectsToSync = JSON.parse(JSON.stringify(this.joinedObjects[object.entity_id]));
                delete this.joinedObjects[object.entity_id];
                return this.start(api, newObjectsToSync);
              } else {
                return Promise.resolve([]);
              }
            }
          }).catch((error) => {
            this.logger.error('[uploader.start] fileupload ', error);
            return Promise.resolve([]);
          });
          promises.push(p);
        }else{
          let p = this.store.single(object.entity, object.entity_id).then((data) => {
            //Details zu Datensatz wurden geladen

            objectComplete = data;



            let params = {entity: object.entity, id: object.entity_id, data: objectComplete};

            this.logger.info("[upload.start:replace]", params);

            return api.post('replace', params);
          }).then((data) => {
            //Datensatz wurde auf dem Server synchronsiert
            this.logger.info('[uploader.start] replace::uploaded ', object.entity_id);
            return this.store.query('DELETE FROM queue WHERE entity_id = ? ', [object.entity_id]);
          }).then((data) => {
            //Datensatz wurde aus Queue gelöscht

            if (this.joinedObjects[object.entity_id]) {

              if(this.checkMultipleJoins(object.entity_id)){
                var newObjectsToSync = JSON.parse(JSON.stringify(this.joinedObjects[object.entity_id]));
                delete this.joinedObjects[object.entity_id];
                return this.start(api, newObjectsToSync);
              }else{
                return Promise.resolve([]);
              }
            }
          }).catch((error) => {
            if(error.status == 404){
              let statements =  [];
              statements.push(["DELETE FROM queue WHERE id = ?", [object.id]]);
              statements = this.deleteJoinedObjects(object.entity_id, statements);
              this.store.batch(statements).then().catch();
              this.logger.info('[uploader.start] replace::error-404 ', object.entity_id);
            }

            this.logger.error('[uploader.start] replace ', error);
            return Promise.resolve(false);
          });

          promises.push(p);
        }

      }
    }

    return Promise.all(promises);
  }


}