import {Api} from "./api/api";
import {User} from "./auth/user";
import {Injectable} from "@angular/core";
import {Store} from "./data/store";
import {Schema} from "./data/schema";
import {STORAGE_COMMANDS_INDEX} from "./constants";
import {SyncState} from "./sync/syncstate";
import {Logger} from "./helper/logger";
import {Storage} from "@ionic/storage";
import {Service} from "./sync/service";
import {Message} from "./sync/message";
import {Observable} from "rxjs/internal/Observable";
import {File} from "@ionic-native/file/ngx";
import {ApiResponse} from "./api/response.interface";
import {Stats} from "./data/stats";

@Injectable()
export class ContentflySdk {

  private forceSyncTo : boolean = false;

  constructor(public api : Api, private file : File, private logger : Logger, private schema : Schema, private syncService : Service, public stats : Stats, private storage : Storage, private store: Store, private syncState : SyncState, public user : User) {
    this.api.setUser(this.user);
    this.store.setUser(this.user);

    this.syncService.setApi(api);
    this.stats.setApi(api);
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
   * Anzahl der noch offenen Datensätze vom Sever prüfen
   */
  public countFromServer() : Promise<number>{
    return this.syncService.countFromServer();
  }

  /**
   * Umwandlung eines Base64-Strings in einen Blob
   * @param string b64Data
   * @param string contentType
   */
  private b64toBlob(b64Data, contentType) : Blob {

    let b64plittedData  = b64Data.split(',')
    let b64RawData      = b64plittedData.length == 2 ? b64plittedData[1] : b64plittedData[0];

    contentType = contentType || '';
    var sliceSize = 512;
    var byteCharacters = atob(b64RawData);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);

      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }

  /**
   * Löschen eines Objektes einer bestimmten Entität
   * @param {string} entityName
   * @param {string} id
   * @returns {Promise<any>}
   */
  public delete(entityName : string, id : string) : Promise<any>{
    return this.store.delete(entityName, id).then((data) => {
      if(this.forceSyncTo) this.silentSync();
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
   * Speichern einer neuen Datei
   * @param {string} base64Data
   * @returns {Promise<any>}
   */
  public insertBase64File(base64Data : string, type: string, fileName : string = ''){
    let data = {
      'type' : type,
      'name' : fileName,
      'hash' : 'local',
      '_hashLocal' : 'local',
      'size' : 0,
      'isIntern': 0
    };

    let newFileId           = null;

    return this.insert('PIM\\File', data).then((id) => {
      newFileId = id;
      let blob = this.b64toBlob(base64Data, type);
      return this.file.writeFile(this.file.dataDirectory, newFileId, blob, { replace: true })
    }).then(() => {
      this.logger.info('FILE SAVED', newFileId);
      setTimeout( () => {
        if(this.forceSyncTo) this.silentSync();
      }, 1000);

      return newFileId;
    }).catch((error) => {
      this.logger.error('insertBase64File', error);
    })
  }


  /**
   * Rückgabe des letzten Synchronisieruns-Datum vom Server
   * @returns {string}
   */
  lastSyncDate(){
    return this.syncState.getLastSyncDate('PIM\\User');
  }

  /**
   * Rückgabe des letzten Synchronisieruns-Datum zum Server
   * @returns {string}
   */
  lastSyncToDate(){
    return this.syncState.getLastSyncToDate();
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
   * Gibt alle lokal geänderten und zu synchronisierenden Datensätze zurück
   * @returns {Promise<any[]>}
   */
  queue(){
    return this.store.queue();
  }

  /**
   * Gibt die eindeutig lokal geänderten und zu synchronisierenden Datensätze zurück
   * @returns {Promise<any[]>}
   */
  queueCleaned(){
    return this.store.queueCleaned();
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
    return this.user.load().then(() => {
      this.api.setUser(this.user);
      this.store.setUser(this.user);

      return Promise.resolve();
    });
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
   * @param {boolean} disableSyncFrom Deaktiviert die Synchronisierung vom Server
   */
  public silentSync(disableSyncFrom : boolean = false){
    this.sync(disableSyncFrom).subscribe(() => {}, () => {}, () =>{});
  }

  /**
   * Flag, um bei der Synchronisierug die Datensätze als einzelne Statements für Fehlermeldungen zu schreiben
   * @param {boolean} doDebug
   */
  public setApiDebugRequests(doDebug : boolean){
    this.api.debugRequests = doDebug;
  }

  /**
   * Flag, um bei der Synchronisierug die Datensätze als einzelne Statements für Fehlermeldungen zu schreiben
   * @param {boolean} doDebug
   */
  public setChunkSize(chunkSize : number){
    this.syncService.syncChunkSize = chunkSize;
  }

  /**
   * Flag, um bei der Synchronisierug die Datensätze als einzelne Statements für Fehlermeldungen zu schreiben
   * @param {boolean} doDebug
   */
  public setStoreDebugImportWithoutBatch(doDebug : boolean){
    this.store.debugImportWithoutBatch = doDebug;
  }

  /**
   * Flag, um die Synchronisierung bei jedem Speichervorgang anzustoßen
   * @param {boolean} forceSyncTo
   */
  public setForceSyncTo(forceSyncTo : boolean){
    this.forceSyncTo = forceSyncTo;
  }

  /**
   * Lädt beim Synchronisieren nicht die Original Bilddatei, sondern die entsprechende im Backend definierte Bildgröße
   * @param {string} sizeName
   */
  public setImageDownloadSize(sizeName : string){
    this.syncService.setImageDownloadSize(sizeName);
  }

  /**
   * Setzt einen statischen Authentifizierungs-Token "APPCMS-TOKEN"
   * @param {string} token
   */
  public setStaticToken(token : string){
    this.user.setStatikToken(token);
  }

  /**
   * Startet die Synchronisierung
   * @param {boolean} disableSyncFrom Deaktiviert die Synchronisierung vom Server
   * @returns {Observable<Message>}
   */
  public sync(disableSyncFrom : boolean = false){
    return this.syncService.sync(disableSyncFrom);
  }

  /**
   * Startet die Synchronisierung zum Server
   * @returns {Observable<Message>}
   */
  public syncTo(){
    return this.syncService.syncTo();
  }

  /**
   * Startet den Synchronisations-Projekt vom Server
   * @returns {Observable<Message>}
   */
  public syncFrom(){
    return this.syncService.syncFrom();
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
