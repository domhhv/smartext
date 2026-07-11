import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db-types';

const IMAGES_BUCKET = 'images';
const PAGE_SIZE = 100;

async function listAllFilePaths(client: SupabaseClient<Database>, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(IMAGES_BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      if (item.id === null) {
        paths.push(...(await listAllFilePaths(client, `${prefix}/${item.name}`)));
      } else {
        paths.push(`${prefix}/${item.name}`);
      }
    }

    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return paths;
}

export default async function removeStoragePrefix(client: SupabaseClient<Database>, prefix: string) {
  try {
    const paths = await listAllFilePaths(client, prefix);

    for (let i = 0; i < paths.length; i += PAGE_SIZE) {
      const { error } = await client.storage.from(IMAGES_BUCKET).remove(paths.slice(i, i + PAGE_SIZE));

      if (error) {
        throw error;
      }
    }
import * as Sentry from '`@sentry/nextjs`';

const IMAGES_BUCKET = 'images';
const PAGE_SIZE = 100;

async function listAllFilePaths(client: SupabaseClient<Database>, prefix: string): Promise<string[]> {
  // ...
}

export default async function removeStoragePrefix(client: SupabaseClient<Database>, prefix: string) {
  try {
    const paths = await listAllFilePaths(client, prefix);

    for (let i = 0; i < paths.length; i += PAGE_SIZE) {
      const { error } = await client.storage.from(IMAGES_BUCKET).remove(paths.slice(i, i + PAGE_SIZE));

      if (error) {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error removing storage prefix "${prefix}": `, error);
    Sentry.captureException(error, { tags: { prefix } });
  }
}
}
