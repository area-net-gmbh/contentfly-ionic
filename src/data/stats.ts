import {Injectable} from "@angular/core";

import {Api, STORAGE_STATS_UUID} from "..";
import {Logger} from "../helper/logger";
import { Platform } from '@ionic/angular';
import {Storage} from "@ionic/storage";
import uuid  from 'uuid/v1';

@Injectable()
export class Stats {

  private api : Api           = null;
  private disabled : boolean  = false;
  private uuid : string       = null;
  private tStart : number     = 0;

  constructor(private logger : Logger, private platfrom : Platform, private storage : Storage){

  }

  public end(){
    if(this.disabled){
      return;
    }

    this.getUuid().then((uuid) => {
      let tEnd = new Date().getTime();
      let duration = this.tStart ? Math.round((tEnd - this.tStart) / 1000) : 0;

      let data = this.getData({
        mode: 1,
        duration: duration
      });

      let params = {
        entity: 'Plugins\\Areanet_Stats\\Entity\\Stats',
        data: data
      };

      this.api.post('insert', params).then(() => {
        this.logger.info('Usage Statistics sended', params);
      }).catch((error) => {
        this.logger.error('Usage Statistics', error);
      });
    });
  }

  private getData(data){
    let info = data;

    info['id'] = uuid();
    info['uid'] = this.uuid;

    if(this.platfrom.is('android')){
      info['platform'] = 'android';
    }else if(this.platfrom.is('ios')){
      info['platform'] = 'ios';
    }else{
      info['platform'] = 'misc';
    }

    if(this.platfrom.is('tablet') || this.platfrom.is('ipad')){
      info['category'] = 'tablet';
    }else{
      info['category'] = 'smartphone';
    }

    //info['version'] = this.platfrom.version().str;

    return info;
  }

  private getUuid() : Promise<string>{

    if(this.uuid){
      return Promise.resolve(this.uuid);
    }

    return this.storage.get(STORAGE_STATS_UUID).then((id) => {
      if(id){
        this.uuid = id;
        return this.uuid;
      }

      this.uuid = uuid();
      this.storage.set(STORAGE_STATS_UUID, this.uuid);

      return this.uuid;
    }).catch( () => {
      this.uuid = uuid();
      this.storage.set(STORAGE_STATS_UUID, this.uuid);

      return this.uuid;
    });
  }

  public start(){
    if(this.disabled){
      return;
    }

    this.getUuid().then((uuid) => {
      this.tStart = new Date().getTime();
    });
  }

  public setApi(api : Api){
    this.api = api;
  }

  public setDisabled(disabled : boolean){
    this.disabled = disabled
  }

  public view(reference : string, referenceId : string, label : string){
    if(this.disabled){
      return;
    }

    this.getUuid().then((uuid) => {
        let data = this.getData({
          mode: 2,
          reference: reference,
          referenceId: referenceId,
          label: label
        });

        let params = {
          entity: 'Plugins\\Areanet_Stats\\Entity\\Stats',
          data: data
        };

        this.api.post('insert', params).then(() => {
          this.logger.info('View Statistics sended', params);
        }).catch((error) => {
          this.logger.error('View Statistics', error);
        });
      });
  }

}