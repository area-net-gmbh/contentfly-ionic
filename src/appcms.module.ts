import { Observable } from 'rxjs';
import { NgModule, ModuleWithProviders } from '@angular/core';
import {AppcmSDK} from "./providers/appcm-sdk";

@NgModule({
    declarations: [

    ],
    exports: [

    ]
})
export class AppcmsModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: AppcmsModule,
            providers: [ AppcmSDK ]
        };
    }
}