export const DB_NAME : string             = "appcms_db";
export const STORAGE_USER : string        = "appcms_user_data";
export const STORAGE_SCHEMA : string      = "appcms_schema";
export const STORAGE_SYNC_STATE : string  = "appcms_sync_state";
export const STORAGE_COMMANDS_INDEX : string  = "appcms_dbcommands_index";
export const SYNC_CHUNK_SIZE : number     = 5000;
export const ENTITIES_TO_EXCLUDE : string[] = ['_hash', 'PIM\\File', 'PIM\\Folder', 'PIM\\Token', 'PIM\\PushToken', 'PIM\\ThumbnailSettings', 'PIM\\Log', 'PIM\\Permission', 'PIM\\Nav', 'PIM\\NavItem'];