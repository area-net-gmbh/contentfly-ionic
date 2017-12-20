import { Injectable } from '@angular/core';

export class AppcmSDK {

    constructor(message: string) {
        console.log("HELLO: " + message);
    }

    init() {
        console.log("INIT APPCMS-SDK");
    }
}
