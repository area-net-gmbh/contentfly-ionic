import {Http, Headers, RequestOptions} from "@angular/http";
import {Inject, Injectable} from "@angular/core";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {User} from "./user";
import {ApiResponse} from "./api-response.interface";
import {API_CONFIG} from "../contentfly.module";
import {ApiConfig} from "./api.config";

@Injectable()
export class Api {

  private user : User = null;

  constructor(private http: HttpClient, @Inject(API_CONFIG) private config: ApiConfig) {

  }

  get(endpoint, params = null){
    return this.request('GET', 'api/' + endpoint, params);
  }

  login(username : string, password : string, loginManager? : string){
    let params = {
      'alias' : username,
      'pass' : password,
      'withSchema': true
    };

    if(loginManager){
      params['loginManager'] = loginManager;
    }
    let promise = new Promise<ApiResponse>((resolve, reject) => {
      this.http.post<ApiResponse>(this.config.baseUrl + '/auth/login', params).subscribe(
        successRequest => {
          resolve(successRequest);
        },
        errorRequest => {
          reject(errorRequest.error.message ? errorRequest.error.message : errorRequest.message);
        })
      ;
    });

    return promise;
  }

  post(endpoint, params = null){
    return this.request('POST', 'api/' + endpoint, params);
  }

  setUser(user: User){
    this.user = user;
  }

  /* PRIVATE */

  private request(method, endpoint, params = null) {

    let promise = new Promise((resolve, reject) => {
        let headers = {'Content-Type' : 'application/json'};
        if(this.user.token){
          headers['APPCMS-TOKEN'] = this.user.token
        }

        if(method == 'POST'){
          this.http.post(this.config.baseUrl + '/' + endpoint, params, {headers: headers}).subscribe(
            data => {
              //console.log("APPCMS: "+ this.config.baseUrl + '/' + endpoint);
              //console.log(JSON.stringify(params));
              //console.log(JSON.stringify(data));
              resolve(data);
            },
            error => {
              //console.log(JSON.stringify(error));
              reject(error);
            })
          ;
        } else{
          this.http.get(this.config.baseUrl + '/' + endpoint, {headers: headers}).subscribe(
            data => {
              //console.log(JSON.stringify(data));
              resolve(data);
            },
            error => {
              //console.log(JSON.stringify(error));
              reject(error);
            })
          ;
        }

      });

      return promise;


  }

}
