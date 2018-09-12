export const CONTENTFLY_SYNC_START            = "CONTENTFLY_SYNC_START";
export const CONTENTFLY_NEW_LOGMESSAGE        = "CONTENTFLY_NEW_LOGMESSAGE";
export const CONTENTFLY_SYNC_SUCCESS          = "CONTENTFLY_SYNC_SUCCESS";

export const DB_NAME : string                 = "contentfly_db";
export const STORAGE_USER : string            = "contentfly_user_data";
export const STORAGE_SCHEMA : string          = "contentfly_schema";
export const STORAGE_SYNC_STATE : string      = "contentfly_sync_state";
export const STORAGE_COMMANDS_INDEX : string  = "contentfly_dbcommands_index";
export const SYNC_CHUNK_SIZE : number         = 5000;
export const ENTITIES_TO_EXCLUDE : string[]   = ['_hash', 'PIM\\Folder', 'PIM\\Token', 'PIM\\PushToken', 'PIM\\ThumbnailSetting', 'PIM\\Log', 'PIM\\Permission', 'PIM\\Nav', 'PIM\\NavItem'];