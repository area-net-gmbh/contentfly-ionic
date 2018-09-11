import {Injectable} from "@angular/core";
import {Store} from "../data/store";
import {QueueType} from "../data/queuetype";
import {Api} from "../api/api";
import {Logger} from "../helper/logger";
import {File} from "@ionic-native/file";

@Injectable()
export class Uploader {

  joinedObjects : {} = {};
  objectsToSyncCount : number = 0;

  constructor(private store : Store, private logger : Logger, private file : File){

  }

  /**
   * Prüfen ob verknüpfte Datensätze zu einem Objekt vorhanden sind
   * @param objects
   * @param {string} id
   * @returns {boolean}
   */
  private checkMultipleJoins(objects : any, id : string){

    for(let objectIndex in objects[id]){
      let object       = objects[id][objectIndex];

      for(let keyId in objects){
        if(keyId == id) continue;

        for(let subobject of objects[keyId]){
          if(subobject.id == object.id){
            objects[id].splice(objectIndex, 1);
            this.objectsToSyncCount--;
          }
        }
      }
    }

    return objects[id].length > 0;
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
        let p = api.post('delete', {entity: object.entity, id: object.entity_id}).then(() => {
          return this.store.query('DELETE FROM queue WHERE entity_id = ? ', [object.entity_id]);
        }).catch((error) => {
          this.logger.error('[uploader.start] api->delete', error);

          if(error.code = 404){
            this.store.query('DELETE FROM queue WHERE id = ?', [object.id]).then().catch();
          }

          return Promise.resolve();
        });

        promises.push(p);
      } else{
        let objectComplete = null;

        if(object.entity == 'PIM\\File') {
          let p = this.store.single(object.entity, object.entity_id).then((data) => {
            //Details zu Datensatz wurden geladen

            objectComplete = data;
            return this.file.readAsArrayBuffer(this.file.dataDirectory, object.entity_id);
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
              if (this.checkMultipleJoins(this.joinedObjects, object.entity_id)) {
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

            return api.post('replace', params);
          }).then((data) => {
            //Datensatz wurde auf dem Server synchronsiert

            return this.store.query('DELETE FROM queue WHERE entity_id = ? ', [object.entity_id]);
          }).then((data) => {
            //Datensatz wurde aus Queue gelöscht

            if (this.joinedObjects[object.entity_id]) {

              if(this.checkMultipleJoins(this.joinedObjects, object.entity_id)){
                var newObjectsToSync = JSON.parse(JSON.stringify(this.joinedObjects[object.entity_id]));
                delete this.joinedObjects[object.entity_id];
                return this.start(api, newObjectsToSync);
              }else{
                return Promise.resolve([]);
              }
            }
          }).catch((error) => {
            if(error.code = 404){
              let statements =  [];
              statements.push(["DELETE FROM queue WHERE id = ?", [object.id]]);
              statements = this.deleteJoinedObjects(object.entity_id, statements);
              this.store.batch(statements).then().catch()
            }

            this.logger.error('[uploader.start] replace ', error);
            return Promise.resolve();
          });

          promises.push(p);
        }

      }
    }

    return Promise.all(promises);
  }





}