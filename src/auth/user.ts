import {Injectable} from "@angular/core";
import {Storage} from "@ionic/storage";
import {ApiResponse} from "../api/response.interface";
import {STORAGE_USER} from "../constants";

@Injectable()
export class User {
  id : string = null;
  alias: string = null;
  email: string = null;
  group_id: string = null;
  group : any  = {};
  isAdmin: boolean = false;
  token: string = null;
  data: any = {};

  constructor(private storage : Storage) {

  }

  /**
   * Prüft, ob ein Benutzer existiert
   * @returns {boolean}
   */
  public exists(){
    return (this.id != null);
  }

  /**
   * Lädt einen bestehenden Benutzer aus dem internen Speicher
   * @returns {Promise<void>}
   */
  public load(){
    return this.storage.get(STORAGE_USER).then((data) => {

      if (data != null) {

        this.id = data.user.id;
        this.alias = data.user.alias;
        this.isAdmin = data.user.isAdmin;
        this.email = data.user.email;
        this.data = data.data;
        this.token = data.token;
        this.group_id = data.user.group ? data.user.group.id : null;
        this.group = data.user.group;
      }

      return Promise.resolve();
    });
  }

  /**
   * Setz den Benutzer aus der der API-Rückgabe auth/login
   * @param {ApiResponse} data
   */
  set(data: ApiResponse){
    this.id       = data.user.id;
    this.alias    = data.user.alias;
    this.isAdmin  = data.user.isAdmin;
    this.email    = data.user.email;
    this.data     = data.data;
    this.token    = data.token;
    this.group_id = data.user.group ? data.user.group.id : null;
    this.group    = data.user.group;
    this.storage.set(STORAGE_USER, data);
  }

  /**
   * Setzt einen statischen Token, ohne explizites Benutzer-Login
   * @param {string} token
   */
  setStatikToken(token: string){
    this.token = token;
    this.storage.set(STORAGE_USER, {token: token, user: {id: null, alias: null, isAdmin: false, email: null}});
  }

  /**
   * Löscht den Benutzer aus dem internen Speicher
   */
  unset(){
    this.id       = null;
    this.alias    = null;
    this.isAdmin  = false;
    this.email    = null;
    this.token    = null;
    this.data     = {};
    this.group_id = null;
    this.group    = {};

    this.storage.remove(STORAGE_USER);
  }
}
