export const DB_NAME : string                 = "contentfly_db";
export const STORAGE_USER : string            = "contentfly_user_data";
export const STORAGE_SCHEMA : string          = "contentfly_schema";
export const STORAGE_SYNC_STATE : string      = "contentfly_sync_state";
export const STORAGE_COMMANDS_INDEX : string  = "contentfly_dbcommands_index";
export const SYNC_CHUNK_SIZE : number         = 5000;
export const ENTITIES_TO_EXCLUDE : string[]   = ['_hash', 'PIM\\File', 'PIM\\Folder', 'PIM\\Token', 'PIM\\PushToken', 'PIM\\ThumbnailSettings', 'PIM\\Log', 'PIM\\Permission', 'PIM\\Nav', 'PIM\\NavItem'];