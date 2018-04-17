import {Api} from "./classes/api";
import {User} from "./classes/user";
import {Injectable} from "@angular/core";
import {Store} from "./classes/store";
import {Schema} from "./classes/schema";
import {ENTITIES_TO_EXCLUDE, STORAGE_COMMANDS_INDEX, SYNC_CHUNK_SIZE} from "./constants";
import {SyncState} from "./classes/syncstate";
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";
import {Observer} from "rxjs/Observer";
import {Logger} from "./classes/logger";
import {Storage} from "@ionic/storage";

@Injectable()
export class AppcmSdk {

    private syncService : Observable<any> = null;
    private lastSyncProcess : {} = null;
    private synServiceSubject : Subject<any> = null;
    private entitiesSynced : object = {};

    constructor(private api : Api, private store: Store, private schema : Schema, private logger : Logger, private syncState : SyncState, public user : User, private storage : Storage) {
      this.api.setUser(this.user);
    }

    commands(commands : any[]){
      this.storage.get(STORAGE_COMMANDS_INDEX).then((index) => {
        index = index == null ? 0 : parseInt(index);
        for(var i = index; i < commands.length; i++){
          for(var c = 0; c < commands[i].length; c++) {
            console.log(commands[i][c]);
            this.store.query(commands[i][c], []).then(() => {
              console.log("OK = " );
            }).catch((error) => {
              console.log(JSON.stringify(error) + " = ");
            });
          }
        }

        this.storage.set(STORAGE_COMMANDS_INDEX, commands.length);

      }).catch(() => {

      });
    }

    login(username : string, password : string, loginManager? : string){
      var promise = new Promise((resolve, reject) => {
        this.api.login(username, password, loginManager).then((userData) => {
          this.user.set(userData);
          //this.schema.set(userData['schema']);
          resolve();
        }).catch((error) => {
          reject(error);
        })
      });
      //test
      return promise;
    }

    lastSyncDate(){
      return this.syncState.getLastSyncDate('PIM\\User');
    }

    logout(){
      this.store.delete();
      this.user.unset();
      this.syncState.unset();
      this.schema.unset();
    }

    query(sqlStatement : string, params : any[]) : Promise<any[]>{
      return this.store.query(sqlStatement, params);
    }

    ready(){
      return this.user.load();
    }

    setDebug(enabled : boolean){
      this.logger.setEnabled(enabled);
    }

    sync(next : (value : any) => void, error : (value : any) => void = null, complete : () => void = null){
      this.synServiceSubject = new Subject();
      this.synServiceSubject.subscribe(next, error, complete);

      this.syncService = new Observable(observer => {
        let countParams : {}  = {};

        for (let entityName in this.schema.data) {
          if(ENTITIES_TO_EXCLUDE.indexOf(entityName) >= 0) continue;

          if(this.syncState.getLastSyncDate(entityName)){
            countParams[entityName] = this.syncState.getLastSyncDate(entityName);
          }

        }

        let params = {};
        if(Object.keys(countParams).length){
          params = {lastModified: countParams};
        }

        this.logger.info("SYNC Calculate count and schema modifications");
        this.logger.info("PARAMS", params);
        this.api.post('count', params).then((countRequest) => {
          if(countRequest['hash'] != this.schema.hash){
            this.logger.info("SYNC Schema updating...");
            this.api.get('schema').then((schema) => {
              this.schema.update(schema['data']);
              this.store.updateSchema(this.schema).then(() => {
                this.schema.save();
                this.startSync(observer, countRequest['data']['dataCount']);
              }).catch((errorMessage) => {
                this.logger.error("SYNC store.updateSchema", errorMessage);
                observer.error(errorMessage);
              });
            }).catch((error) => {
              this.logger.error("SYNC api/schema", error);
              observer.error(error);
            })
          }else{
            this.startSync(observer, countRequest['data']['dataCount']);
          }

        }).catch((error) => {
          this.logger.error("SYNC api/count", error);
          observer.error(error);
        });
      });

      this.syncService.subscribe(this.synServiceSubject);

    }

    private startSync(observer : Observer<any>, dataCount : number){
      let currentDataCount  = 0;

      this.entitiesSynced   = {};
      var entitiesToSync    = 0;
      for (let entityName in this.schema.data) {
        if(ENTITIES_TO_EXCLUDE.indexOf(entityName) >= 0) continue;

        this.entitiesSynced[entityName] = false;
        entitiesToSync++;
      }
      this.logger.info("SYNC Starting...");
      for (let entityName in this.schema.data) {
        if(ENTITIES_TO_EXCLUDE.indexOf(entityName) >= 0) continue;

        let startFromChunK = this.syncState.getLastChunkSize(entityName);
        let lastSyncDate   = this.syncState.getLastSyncDate(entityName);

        this.syncFromEntity(entityName, lastSyncDate, startFromChunK).subscribe(
          () => {
            currentDataCount++;
            let percent = Math.round(currentDataCount/dataCount * 100);
            this.lastSyncProcess = {percent: percent, current: currentDataCount, all: dataCount};
            observer.next(this.lastSyncProcess);
          },
          () => {
            this.logger.error("SYNC syncFromEntity ", entityName);
            this.lastSyncProcess = null;
            this.syncService = null;
          },
          () => {
            let syncCompleted = true;
            let entitiesSynced = 0;
            for (let entityNameCompleted in this.entitiesSynced) {
              if(!this.entitiesSynced[entityNameCompleted]){
                syncCompleted = false;
              }else{
                entitiesSynced++;
              }
            }
            this.logger.info("SYNC Complete " + entityName + "(" + entitiesSynced + "/" + entitiesToSync + ")", syncCompleted);
            if(syncCompleted){
              observer.complete();
              this.syncService = null;
              this.lastSyncProcess = null;
            }
          });
      }
    }

    public syncObserver(next : (value : any) => void, error : (value : any) => void = null, complete : () => void = null, started : () => void = null){

      if(!this.syncService){
        return;
      }

      if(started) started();
      if(this.lastSyncProcess) next(this.lastSyncProcess);

      this.synServiceSubject.subscribe(next, error, complete);
    }

    private syncFromEntity(entityName : string, lastSyncDate : string, startFromChunk : number){
      let observer = new Observable(observer => {
        let params = {
          select: '*',
          from: entityName,
          setMaxResults: SYNC_CHUNK_SIZE,
          setFirstResult: this.syncState.getLastChunkSize(entityName)
        };

        if(lastSyncDate){
          params['where'] = {'modified > ?' : [lastSyncDate]};
        }

        this.api.post('query', params).then((request) => {
          let data: any[] = request['data'] ? request['data'] : [];
          if (data.length > 0) {
            this.store.import(entityName, data).subscribe(
              () => {
                observer.next();

              },
              () => {
              },
              () => {
                let newStartFromChunK = startFromChunk + SYNC_CHUNK_SIZE;
                this.syncState.setLastChunkSize(entityName, newStartFromChunK);
                this.syncFromEntity(entityName, lastSyncDate, newStartFromChunK).subscribe(
                  () => {
                    observer.next();
                  },
                  () => {

                  },
                  () => {
                    observer.complete();
                  }
                );
              }
            );
          } else {
            this.syncState.setLastChunkSize(entityName, 0);
            this.syncState.setLastSyncDate(entityName, request['ts']);
            this.entitiesSynced[entityName] = true;
            observer.complete();
          }

          this.syncState.save();
        }).catch((error) => {
          this.logger.error("SYNC api/query/" + entityName, error);
          this.entitiesSynced[entityName] = true;
          observer.complete();
        });
      });

      return observer;
    }
}
