import {Injectable} from "@angular/core";
import {Schema} from "./schema";
import {SQLite, SQLiteObject} from "@ionic-native/sqlite";
import {DB_NAME, ENTITIES_TO_EXCLUDE} from "../constants";
import {Observable} from "rxjs/Observable";
import {Logger} from "./logger";



@Injectable()
export class Store {

  private _db : SQLiteObject = null;

  constructor(private sqlite : SQLite, private schema : Schema, private logger : Logger){

  }

  private alterTableForEntity(db: SQLiteObject, entityConfig : any, entityOldConfig : any){

    let promise = new Promise((resolve, reject) => {
      let dbName: string = entityConfig.settings.dbname;

      let tempProperties : string[] = [];
      for (let property in entityOldConfig.properties) {
        if(!entityConfig.properties[property]){
          continue;
        }
        if(entityConfig.properties[property]['type'] == 'multijoin' || entityConfig.properties[property]['type'] == 'multifile'){
          continue
        }
        tempProperties.push('`' + property + '`');
      }

      db.sqlBatch([
        'CREATE TABLE IF NOT EXISTS temp_' + dbName + ' AS SELECT ' + tempProperties.join(',') + ' FROM ' + dbName,
        'DROP TABLE IF EXISTS ' + dbName
      ]).then(() => {
        this.createTableForEntity(db, entityConfig).then(() => {
          db.sqlBatch([
            'INSERT INTO ' + dbName + '(' + tempProperties.join(',') + ') SELECT ' + tempProperties.join(',') + ' FROM temp_' + dbName,
            'DROP TABLE temp_' + dbName
          ]).then( () =>  {
            resolve();
          }).catch((error) => {
            db.sqlBatch([
              'DROP TABLE IF EXISTS ' + dbName,
              'ALTER TABLE temp_' + dbName + ' RENAME TO ' + dbName,
             ]);
            reject();
          });

        }).catch((error) => {
          db.executeSql('ALTER TABLE temp_' + dbName + ' RENAME TO ' + dbName, []);
          reject();
        });
      }).catch((error) => {
        reject();
      });
    });

    return promise;
  }

  batch(commands : string[]){
    let promise = new Promise((resolve, reject) => {
      this.db().then((db) => {
        db.sqlBatch(commands).then(() => {
          resolve();
        }).catch((error) => {
          reject(error);
        });
      }).catch((error) => {
        reject(error);
      });
    });

    return promise;
  }

  private createTableForEntity(db: SQLiteObject, entityConfig : any){
    let promise = new Promise((resolve, reject) => {
      let dbName: string = entityConfig.settings.dbname;
      let createTableString: string = "CREATE TABLE `" + dbName + "` (";
      let propertiesCreateStatement: string[] = [];

      for (let property in entityConfig.properties) {
        let propertyConfig: any = entityConfig.properties[property];
        let type: string = propertyConfig.type;
        let dbtype: string = "";
        let special: string = "";

        switch (type) {
          case "virtualjoin":
          case "join":
            dbtype = "TEXT";
            break;
          case "multijoin":
          case "multifile":
            if (propertyConfig.acceptFrom) {
              continue
            }

            db.executeSql("CREATE TABLE IF NOT EXISTS `" + dbName + "_" + property + "` (`" + dbName + "_id` TEXT, `\" + property + \"_id` TEXT)", {})
              .then(() => {
              })
              .catch(e => {
                reject("APP-CMS: Cannot create table " + dbName + "_" + property);
              });

            continue;
          case "string":
          case "datetime":
          case "date":
          case "time":
            dbtype = "text";
            break;
          default:
            dbtype = propertyConfig.dbtype;
            break
        }


        if (property == "id") {
          special = "PRIMARY KEY NOT NULL";
        } else if (propertyConfig.nullable === false) {
          special = "NOT NULL";
        }

        propertiesCreateStatement.push("`" + property + "` " + dbtype + " " + special);

      }

      createTableString += propertiesCreateStatement.join(", ");
      createTableString += ")";


      db.executeSql(createTableString, {})
        .then(() => {
          resolve();
        })
        .catch(e => {
          if(e.code == 5){
            resolve();
          }else{
            reject("APP-CMS: Cannot create table " + dbName);
          }

        });
    });

    return promise;

  }

  db(){
    var promise = new Promise<SQLiteObject>((resolve, reject) => {
      if(this._db != null){
        resolve(this._db);
      }else {
        this.sqlite.create({
          name: DB_NAME,
          location: 'default'
        }).then((db: SQLiteObject) => {
          this._db = db;
          resolve(this._db);
        }).catch(error => {
        });
      }
    });

    return promise;

  }

  delete(){
    this.sqlite.deleteDatabase({
      name: DB_NAME,
      location: 'default'
    }).then(() => {

    }).catch(() => {

    });
  }

  import(entity: string, data : any[]){
    let observer = new Observable(observer => {

      this.db().then((db) => {
          let properties : any[] = this.schema.data[entity].properties;
          let dbName : string    = this.schema.data[entity].settings.dbname;

          let fieldsStatement : string[] = [];
          let placeholderStatement : string[] = [];

          for (let field in properties) {
            let propertyConfig : any[] = properties[field];
            let type : string = propertyConfig['type'];
            if(type == "virtualjoin" || type == "multijoin" || type == "multifile"){
              continue
            }

            fieldsStatement.push(field);
            placeholderStatement.push("?");
          }

          let preparedSQLStatement = "REPLACE INTO `" + dbName + "`(" + fieldsStatement.join(",") + ") VALUES(" + placeholderStatement.join(",") + ")";
          let batchStatements : any[] = [];

          for (let props of data) {

            let id: string = props['id'];
            let valueStatement: any[] = [];

            for (let field in props) {
              let rawValue = props[field];
              let stmtColInt = fieldsStatement.indexOf(field);
              let propertyConfig = properties[field];

              if (stmtColInt == -1 || !propertyConfig) {
                continue;
              }

              let type: string = propertyConfig['type'];
              if (type == 'multijoin' || type == 'multifile') {
                //@TODO: SQL-QUERY MULTIJOIN
              } else {
                valueStatement[stmtColInt] = rawValue;
              }

            }

            batchStatements.push([preparedSQLStatement, valueStatement]);
            observer.next();
          }



          db.sqlBatch(batchStatements).then(() => {
            observer.complete();
          }).catch((error)=>{
            this.logger.error("SYNC store.import::" + entity, error);
            observer.complete();
          });

      }).catch(() => {
        console.log("DB CREATE ERROR 1");
      });
    });

    return observer;
  }

  query(sqlStatement : string, params : any[]) : Promise<any[]>{

    var promise = new Promise<any[]>((resolve, reject) => {
      this.logger.info("store.query ", "open");
      this.db().then((db) => {
        this.logger.info("store.query ", "start");
        db.executeSql(sqlStatement, params)
          .then((data) => {
            this.logger.info("store.query ", "loaded");
            let items : any[] = [];
            if (data.rows.length > 0) {
              for (var i = 0; i < data.rows.length; i++) {
                items.push(data.rows.item(i));
              }
            }
            this.logger.info("store.query ", "finished");
            resolve(items);
          })
          .catch((error) => {
            reject(error);
          });
      }).catch(() => {
        reject("APP-CMS: Cannot create/access database.");
      });
    });

    return promise;
  }


  updateSchema(schema: Schema){
    this.schema = schema;

    var promise = new Promise<SQLiteObject>((resolve, reject) => {
      this.db().then((db) => {

        let entitiesToCreate = Object.keys(schema.data).length - ENTITIES_TO_EXCLUDE.length;
        let entitiedCreated  = 0;

        if(!this.schema.oldData) {
          for (let key in schema.data) {
            if(ENTITIES_TO_EXCLUDE.indexOf(key) >= 0) continue;
            this.logger.info("SYNC store.updateSchema CREATE ", key);
            let entityConfig: any = schema.data[key];

            this.createTableForEntity(db, entityConfig).then(() => {
              entitiedCreated++;
              if (entitiedCreated == entitiesToCreate) {
                resolve();
              }
            }).catch((error) => {
              reject(error);
            });


          }
        }else{
          for (let key in schema.data) {
            if(ENTITIES_TO_EXCLUDE.indexOf(key) >= 0) continue;

            let entityConfig: any = schema.data[key];

            if (!schema.oldData[key]) {
              this.logger.info("SYNC store.updateSchema CREATE ", key);
              this.createTableForEntity(db, entityConfig).then(() => {
                entitiedCreated++;
                if (entitiedCreated == entitiesToCreate) {
                  resolve();
                }
              }).catch((error) => {
                reject(error);
              });

            } else {

              let entityOldConfig: any  = schema.oldData[key];
              this.logger.info("SYNC store.updateSchema UPDATE", key);
              this.alterTableForEntity(db, entityConfig, entityOldConfig).then(() => {
                entitiedCreated++;
                if (entitiedCreated == entitiesToCreate) {
                  resolve();
                }
              }).catch((error) => {
                reject(error);
              });
            }
          }
        }
      }).catch(() => {
        reject("APP-CMS: Cannot create/access database.");
      });
    });

    return promise;
  }
}