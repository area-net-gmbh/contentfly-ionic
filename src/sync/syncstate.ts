import {Injectable} from "@angular/core";
import {STORAGE_SYNC_STATE} from "../constants";
import {Storage} from "@ionic/storage";
import {Logger} from "..";

@Injectable()
export class SyncState {
  private data : any= null;

  constructor(private logger : Logger, private storage : Storage) {

  }

  load(){

    if(this.data){
      return Promise.resolve(true);
    }

    return this.storage.get(STORAGE_SYNC_STATE).then((syncState) => {
      this.logger.info('SyncState::init', syncState);
      if(syncState != null){
        this.data = syncState;
      }else{
        this.data = {};
      }

      return Promise.resolve(true);
    }).catch((errro) => {
      this.logger.error('SyncState::init', errro);
    });
  }

  getLastSyncDate(entityName : string) : string{
    return this.get(entityName, 'ts', null);
  }

  getStartSyncDate(entityName : string) : string{
    return this.get(entityName, 'tsstart', null);
  }

  getLastSyncToDate(){
    return this.data['tsto'] ? this.data['tsto'] : null;
  }
  
  getLastChunkSize(entityName : string) : number{
    return this.get(entityName, 'chunk', 0);
  }

  getLastSyncStartDate(){
    return this.data && this.data['syncstartts'] ? this.data['syncstartts'] : null;
  }

  save(){
    this.storage.set(STORAGE_SYNC_STATE, this.data);
  }

  setLastSyncDate(entityName : string, ts : string){
    this.set(entityName, 'ts', ts);
  }

  setLastSyncToDate(ts : string){
    this.data['tsto'] = ts;
  }

  setStartSyncDate(entityName : string, ts : string){
    this.set(entityName, 'tsstart', ts);
  }

  setLastSyncStartDate(){
    let date = new Date();
    this.data['syncstartts'] = date.getTime();
  }

  setLastChunkSize(entityName : string, chunk : number){
    this.set(entityName, 'chunk', chunk);
  }

  private get(entityName : string, key : string, defaultValue) : any{
    if(!this.data[entityName]){
      return defaultValue;
    }

    return this.data[entityName][key] ? this.data[entityName][key] : defaultValue;
  }

  private set(entityName : string, key : string, value){
    if(!this.data[entityName]){
      this.data[entityName] = {};
    }

    this.data[entityName][key] = value;
  }

  unset(){
    this.data = {};
    this.storage.remove(STORAGE_SYNC_STATE);
  }
}