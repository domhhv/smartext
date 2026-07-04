import { type CamelCasedPropertiesDeep } from 'type-fest';

import type { Tables, TablesInsert, TablesUpdate } from '@db-types';

export type FolderItem = CamelCasedPropertiesDeep<Tables<'folders'>>;

export type FoldersInsert = CamelCasedPropertiesDeep<TablesInsert<'folders'>>;

export type FoldersUpdate = CamelCasedPropertiesDeep<TablesUpdate<'folders'>>;
