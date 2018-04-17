import {NgModule, ModuleWithProviders, InjectionToken} from '@angular/core';
import {AppcmSdk} from "./appcm-sdk";
import {Api} from "./classes/api";
import {User} from "./classes/user";
import {ApiConfig} from "./classes/api.config";
import {Store} from "./classes/store";
import {Schema} from "./classes/schema";
import {SyncState} from "./classes/syncstate";
import {Logger} from "./classes/logger";

export const API_CONFIG = new InjectionToken<string>('ApiConfig');

@NgModule({
    declarations: [

    ],
    exports: [

    ],
    imports: [

    ]
})
export class AppcmsModule {
    static forRoot(config: ApiConfig): ModuleWithProviders {
        return {
            ngModule: AppcmsModule,
            providers: [
              {provide: API_CONFIG, useValue: config},
              AppcmSdk,
              Api,
              Store,
              SyncState,
              User,
              Schema,
              Logger
            ]
        };
    }
}