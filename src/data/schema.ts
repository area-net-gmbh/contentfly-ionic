import {Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";
import {STORAGE_SCHEMA,} from "../constants";

@Injectable()
export class Schema {
  hash: string      = null;
  data: any         = {};
  oldData: any      = null;
  permissions: any  = {};

  constructor(private storage : Storage) {
    this.storage.get(STORAGE_SCHEMA).then((schema) => {
      if(schema != null){
        this.hash         = schema.data._hash;
        this.data         = schema.data;
        this.permissions  = schema.permissions;
      }
    });
  }

  getMultijoinDetails(){

  }

  set(schema: any){
    this.hash         = schema.data._hash;
    this.data         = schema.data;
    this.permissions  = schema.permissions;

    this.storage.set(STORAGE_SCHEMA, schema);
  }

  unset(){
    this.hash = null;
    this.data = {};
    this.oldData = {};
    this.permissions = {};
    this.storage.remove(STORAGE_SCHEMA);
  }

  update(data: any, permissions: any = {}){
    this.oldData      = this.data;
    this.data         = data;
    this.permissions  = permissions;
  }

  save(){
    this.oldData = null;
    this.hash    = this.data._hash;

    let schema = {
      data: this.data,
      permissions: this.permissions
    };
    this.storage.set(STORAGE_SCHEMA, schema);
  }

}