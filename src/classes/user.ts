import {Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";
import {ApiResponse} from "./api-response.interface";
import {STORAGE_USER} from "../constants";

@Injectable()
export class User {
    id : string = null;
    alias: string = null;
    isAdmin: boolean = false;
    token: string = null;
    data: any = {};

    constructor(private storage : Storage) {

    }

    exists(){
      return (this.id != null);
    }

    load(){

      var promise = new Promise((resolve, reject) => {
        this.storage.get(STORAGE_USER).then((data) => {
          if(data != null){
            this.id       = data.user.id;
            this.alias    = data.user.alias;
            this.isAdmin  = data.user.isAdmin;
            this.data     = data.data;
            this.token    = data.token;
          }
          resolve();
        }).catch(()=>{
          resolve();
        });
      });

      return promise;
    }

    set(data: ApiResponse){
      this.id       = data.user.id;
      this.alias    = data.user.alias;
      this.isAdmin  = data.user.isAdmin;
      this.data     = data.data;
      this.token    = data.token;

      this.storage.set(STORAGE_USER, data);
    }

    unset(){
      this.id       = null;
      this.alias    = null;
      this.isAdmin  = false;
      this.token    = null;
      this.data     = {};

      this.storage.remove(STORAGE_USER);
    }
}