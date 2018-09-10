import {Api} from "./api/api";
import {User} from "./auth/user";
import {Injectable} from "@angular/core";
import {Store} from "./data/store";
import {Schema} from "./data/schema";
import {STORAGE_COMMANDS_INDEX} from "./constants";
import {SyncState} from "./sync/syncstate";
import {Observable} from "rxjs/Observable";
import {Logger} from "./helper/logger";
import {Storage} from "@ionic/storage";
import {Events} from "ionic-angular";
import {File} from "@ionic-native/file";
import {Service} from "./sync/service";

@Injectable()
export class ContentflySdk {

  private forceSyncTo : boolean = true;

  constructor(private api : Api, private events : Events, private file : File, private logger : Logger, private schema : Schema, private syncService : Service, private storage : Storage, private store: Store, private syncState : SyncState, public user : User) {
    this.api.setUser(this.user);
    this.store.setUser(this.user);

    this.syncService.setApi(api);
  }

  /**
   * Führt mehrere SQL-Commands aus
   * @param {any[]} commands
   */
  commands(commands : any[]){
    this.storage.get(STORAGE_COMMANDS_INDEX).then((index) => {
      index = index == null ? 0 : parseInt(index);
      for(var i = index; i < commands.length; i++){
        for(var c = 0; c < commands[i].length; c++) {
          this.store.query(commands[i][c], []).then(() => {

          }).catch((error) => {

          });
        }
      }

      this.storage.set(STORAGE_COMMANDS_INDEX, commands.length);

    }).catch(() => {

    });
  }

  /**
   * Löschen eines Objektes einer bestimmten Entität
   * @param {string} entityName
   * @param {string} id
   * @returns {Promise<any>}
   */
  public delete(entityName : string, id : string) : Promise<any>{
    return this.store.delete(entityName, id).then((data) => {
      setTimeout( () => {
        if(this.forceSyncTo) this.silentSync();
      }, 1000);

      return data;
    });
  }

  /**
   * Speichern eines neuen Objektes einer bestimmten Entität
   * @param {string} entityName
   * @param {{}} data
   * @returns {Promise<any>}
   */
  public insert(entityName : string, data : {}) : Promise<any>{
    return this.store.insert(entityName, data).then((data) => {
      if(this.forceSyncTo) this.silentSync();

      return data;
    });
  }

  /**
   * Speichern einer neuen Datei
   * @param {string} filePath
   * @returns {Promise<any>}
   */
  public insertFile(filePath : string){
    let currentName = filePath.substr(filePath.lastIndexOf('/') + 1);
    let correctPath = filePath.substr(0, filePath.lastIndexOf('/') + 1);

    let data = {
      'type' : 'image/jpeg',
      'name' : currentName,
      'hash' : 'local',
      '_hashLocal' : 'local',
      'size' : 0,
      'isIntern': 0
    };

    let newFileId = null;

    return this.insert('PIM\\File', data).then((id) => {
      newFileId = id;
      return id;
    }).then((id) => {
      return this.file.copyFile(correctPath, currentName, this.file.dataDirectory, id);
    }).then((fileEntry) => {
      this.logger.info('FILE SAVED', newFileId);
      setTimeout( () => {
        if(this.forceSyncTo) this.silentSync();
      }, 1000);

      return newFileId;
    });
  }


  /**
   * Rückgabe des letzten Synchronisieruns-Datum
   * @returns {string}
   */
  lastSyncDate(){
    return this.syncState.getLastSyncDate('PIM\\User');
  }

  /**
   * Login in das Contentfly CMS Backend
   * @param {string} username
   * @param {string} password
   * @param {string} loginManager
   * @returns {Promise<any>}
   */
  public login(username : string, password : string, loginManager? : string){

    return this.api.login(username, password, loginManager).then((userData) => {
      this.user.set(userData);
      //this.schema.set(userData['schema']);
      return userData
    });

  }

  /**
   * Logout aus dem Contentfly CMS Backend
   */
  public logout(){
    this.store.deleteDatabase();
    this.user.unset();
    this.syncState.unset();
    this.schema.unset();
  }

  /**
   * Gibt die lokal geänderten und zu synchronisierenden Datensätze zurück
   * @returns {Promise<any[]>}
   */
  queue(){
    return this.store.queue();
  }

  /**
   * Ausführen einer SQL-Query
   * @param {string} sqlStatement
   * @param {any[]} params
   * @returns {Promise<any[]>}
   */
  public query(sqlStatement : string, params : any[]) : Promise<any[]>{
    return this.store.query(sqlStatement, params);
  }

  /**
   * Überprüft, ob das Contentfly SDK einsatzbereit ist
   * @returns {Promise<any>}
   */
  public ready(){
    return this.user.load();
  }

  /**
   * Flag, um Debugausgaben in der Konsole anzuzeigen
   * @param {boolean} enabled
   */
  public setDebug(enabled : boolean){
    this.logger.setEnabled(enabled);
  }

  /**
   * Startet die Synchronisierung zum Server ohne Observable-Rückgabe
   */
  public silentSync(){
    this.sync().subscribe(() => {}, () => {}, () =>{});
  }

  /**
   * Flag, um die Synchronisierung bei jedem Speichervorgang anzustoßen
   * @param {boolean} forceSyncTo
   */
  public setForceSyncTo(forceSyncTo : boolean){
    this.forceSyncTo = forceSyncTo;
  }

  /**
   * Setzt einen statischen Authentifizierungs-Token "APPCMS-TOKEN"
   * @param {string} token
   */
  public setStaticToken(token : string){
    this.user.setStatikToken(token);
  }

  /**
   * Startet die Synchronisierung zum Server
   * @returns {Observable<Message>}
   */
  public sync(){
    return this.syncService.sync();
  }

  /**
   * Speichern eines Objektes einer bestimmten Entität
   * @param {string} entityName
   * @param {{}} data
   * @returns {Promise<any>}
   */
  public update(entityName : string, data : {}) : Promise<any>{
    return this.store.update(entityName, data).then((data) => {
      if(this.forceSyncTo) this.silentSync();

      return data;
    });
  }

}
