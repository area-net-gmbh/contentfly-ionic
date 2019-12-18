import {Mode} from "./mode";

export class Message{

  constructor(mode : Mode, text : string, progress : number = 0, current : number = 0, all : number = 0, progressLabel : string = ''){
    this.mode           = mode;
    this.text           = text;
    this.progressLabel  = progressLabel;
    this.progress       = progress;
    this.current        = current;
    this.all            = all;
  }

  /**
   * Art der Snychronisierung Mode.FROM / Mode.TO
   */
  public mode : Mode;

  /**
   * Zusätzliche Nachricht, "Dateien werden synchronisiert"
   */
  public text : string;

  /**
   * Zusätzlicher Infotext, "synchronisiert/geprüft" für Prozentanzeige
   */
  public progressLabel : string;

  /**
   * Prozentualer Fortschritt der Synchronisierung
   */
  public progress : number;

  /**
   * Aktuelle Zahl der synchronsierten Objekte
   */
  public current : number;

  /**
   * Gesamtanzahl der zu synchronsierenden Objekte
   */
  public all : number;
}