import {Injectable} from "@angular/core";
import {STORAGE_SYNC_STATE} from "../constants";
import {Storage} from "@ionic/storage";

@Injectable()
export class SyncState {
  private data : any= {};

  constructor(private storage : Storage) {
    this.storage.get(STORAGE_SYNC_STATE).then((syncState) => {
      if(syncState != null){
        this.data = syncState;
      }
    }).catch(() => {

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
    return this.data['syncstartts'] ? this.data['syncstartts'] : null;
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