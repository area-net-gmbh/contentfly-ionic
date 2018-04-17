import {Injectable} from "@angular/core";

@Injectable()
export class Logger {
  private enabled : boolean = true;

  setEnabled(enabled : boolean){
    this.enabled = enabled;
  }

  error(message : string, data : any = null){
    if(this.enabled){
      let debugMsd = "[CONTENTFLY ERROR] " + message;
      if(data != null){
        if(data instanceof Array || data instanceof Object){
          debugMsd += " :: " + JSON.stringify(data);
        }else{
          debugMsd += " :: " + data;
        }
      }

      console.log(debugMsd);
    }
  }

  info(message : string, data : any = null){
    if(this.enabled){
      let debugMsd = "[CONTENTFLY] " + message;
      if(data != null){
        if(data instanceof Array || data instanceof Object){
          debugMsd += " :: " + JSON.stringify(data);
        }else{
          debugMsd += " :: " + data;
        }
      }

      console.log(debugMsd);
    }
  }


}