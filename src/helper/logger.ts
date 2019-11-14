import {Injectable} from "@angular/core";
import {CONTENTFLY_NEW_LOGMESSAGE} from "../constants";
import {Events} from "@ionic/angular";

@Injectable()
export class Logger {
  private enabled : boolean = true;

  constructor(private events : Events){

  }

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

      this.events.publish(CONTENTFLY_NEW_LOGMESSAGE, debugMsd);

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

      this.events.publish(CONTENTFLY_NEW_LOGMESSAGE, debugMsd);
      console.log(debugMsd);
    }
  }

}