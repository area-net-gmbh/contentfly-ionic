import {NgModule, ModuleWithProviders, InjectionToken} from '@angular/core';
import {Api} from "./api/api";
import {User} from "./auth/user";
import {Config} from "./api/config";
import {Store} from "./data/store";
import {Schema} from "./data/schema";
import {SyncState} from "./sync/syncstate";
import {Logger} from "./helper/logger";
import {ContentflySdk} from "./contentfly-sdk";
import {Uploader} from "./sync/uploader";
import {Service} from "./sync/service";
import {SQLite} from "@ionic-native/sqlite/ngx";
import {File} from "@ionic-native/file/ngx";
import {HttpClient} from "@angular/common/http";
import {Stats} from "./data/stats";

export const API_CONFIG = new InjectionToken<string>('ApiConfig');

@NgModule({
    declarations: [

    ],
    exports: [

    ],
    imports: [

    ]
})
export class ContentflyModule {
    static forRoot(config: Config): ModuleWithProviders {
        return {
            ngModule: ContentflyModule,
            providers: [
              {provide: API_CONFIG, useValue: config},
              ContentflySdk,
              Api,
              Stats,
              HttpClient,
              Store,
              SyncState,
              User,
              Schema,
              Logger,
              Uploader,
              Service,
              SQLite,
              File
            ]
        };
    }
}