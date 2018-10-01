import {SyncState} from "./sync/syncstate";
import {Uploader} from "./sync/uploader";
import {API_CONFIG} from "./contentfly.module";
import {Schema} from "./data/schema";
import {Service} from "./sync/service";
import {File} from "@ionic-native/file";
import {User} from "./auth/user";
import {Api} from "./api/api";
import {ContentflySdk} from "./contentfly-sdk";
import {Store} from "./data/store";
import {SQLite} from "@ionic-native/sqlite";
import {Logger} from "./helper/logger";
import {SQLiteMock} from "./mock/sqliteobject";

export class Providers {

  public static getProviders(config) {

    let providers;

    if(document.URL.includes('https://') || document.URL.includes('http://')){

      providers = [
        {provide: API_CONFIG, useValue: config},
        ContentflySdk,
        Api,
        Store,
        SyncState,
        User,
        Schema,
        Logger,
        Uploader,
        Service,
        {provide: SQLite, useClass: SQLiteMock},
        File
      ];

    } else {

      providers = [
        {provide: API_CONFIG, useValue: config},
        ContentflySdk,
        Api,
        Store,
        SyncState,
        User,
        Schema,
        Logger,
        Uploader,
        Service,
        SQLite,
        File
      ];

    }

    return providers;

  }

}