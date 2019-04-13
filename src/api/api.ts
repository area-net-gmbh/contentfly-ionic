import {Inject, Injectable} from "@angular/core";
import {HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders, HttpRequest} from "@angular/common/http";
import {User} from "../auth/user";
import {ApiResponse} from "./response.interface";
import {API_CONFIG} from "../contentfly.module";
import {Config} from "./config";
import {catchError, retry, tap} from "rxjs/operators";
import {Observable} from "rxjs/Observable";
import {of} from "rxjs/observable/of";
import {map} from "rxjs/operator/map";
import {Logger} from "../helper/logger";
import {timeout} from "rxjs/operator/timeout";
import {RETRY, TIMEOUT, TIMEOUT_FILES} from "../constants";


@Injectable()
export class Api {

  public retry : number           = RETRY;
  public timeout : number         = TIMEOUT;
  public timeout_filest : number  = TIMEOUT_FILES;
  public user : User              = null;

  constructor(@Inject(API_CONFIG) private config: Config, private logger : Logger, private http: HttpClient) {

  }

  /**
   * Aufruf der FileGet-API
   * @param {string} id
   * @param {string} size
   * @returns {Promise<Blob>}
   */
  public file(id : string, size : string = null){
    let sizeParam = '';
    if(size){
      sizeParam = '/s-' + size;
    }
    console.log("FILE");

    return this.http.get(this.config.baseUrl + '/file/get/' +  id + sizeParam, { responseType: 'blob' }).timeout(this.timeout_filest).retry(this.retry).toPromise();
  }

  /**
   * Aufruf der FileUpload-API
   * @param {string} id
   * @param {string} name
   * @param {Blob} fileData
   * @returns {Promise<any>}
   */
  public fileUpload(id : string, name : string, fileData : Blob){
    let headers = {

    };

    if(this.user.token){
      headers['APPCMS-TOKEN'] = this.user.token
    }

    let params = new FormData();
    params.append('id', id);
    params.append('file', fileData, name);
    return this.http.post(this.config.baseUrl + '/file/upload', params, {headers: headers}).timeout(this.timeout_filest).retry(this.retry).toPromise();
  }

  /**
   * GET-Aufruf an die Contentfly-API
   * @param endpoint
   * @param {any} params
   * @returns {Promise<Object>}
   */
  public get(endpoint, params = null){
    return this.request('GET', 'api/' + endpoint, params);
  }



  /**
   * Aufruf der Login-API
   * @param {string} username
   * @param {string} password
   * @param {string} loginManager
   * @returns {Promise<ApiResponse>}
   */
  public login(username : string, password : string, loginManager? : string){
    let params = {
      'alias' : username,
      'pass' : password,
      'withSchema': true
    };

    if(loginManager){
      params['loginManager'] = loginManager;
    }

    return this.http.post<ApiResponse>(this.config.baseUrl + '/auth/login', params).timeout(this.timeout).retry(this.retry).toPromise();
  }

  /**
   * POST-Aufruf an die Contentfly-API
   * @param endpoint
   * @param {any} params
   * @returns {Promise<Object>}
   */
  public post(endpoint, params = null){
    return this.request('POST', 'api/' + endpoint, params);
  }

  /**
   * Setzen des eingeloggten Benutzers
   * @param {User} user
   */
  public setUser(user: User){
    this.user = user;
  }

  /**
   * Aufruf an die Contentfly-API
   * @param method
   * @param endpoint
   * @param {any} params
   * @returns {Promise<Object>}
   */
  public request(method, endpoint, params = null) : Promise<Object> {
      let headers = {'Content-Type' : 'application/json'};
      if(this.user.token){
        headers['APPCMS-TOKEN'] = this.user.token;
      }

      if(method == 'POST'){

        return this.http.post(this.config.baseUrl + '/' + endpoint, params, {headers: headers}).timeout(this.timeout).retry(this.retry).toPromise();
      } else{

        return this.http.get(this.config.baseUrl + '/' + endpoint, {headers: headers}).timeout(this.timeout).retry(this.retry).toPromise();
      }
  }

}
