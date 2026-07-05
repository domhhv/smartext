'use server';

import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';
import { revalidatePath } from 'next/cache';

import type { FoldersInsert, FoldersUpdate } from '@/lib/models/folder.model';
import createClerkSupabaseClientSsr from '@/lib/utils/create-clerk-supabase-ssr-client';

export async function createFolder(body: FoldersInsert) {
  const client = await createClerkSupabaseClientSsr();

  const { data, error } = await client.from('folders').insert(decamelizeKeys(body)).select();

  if (error) {
    throw error;
  }

  revalidatePath('/');

  return camelcaseKeys(data[0]);
}

export async function removeFolder(folderId: string) {
  const client = await createClerkSupabaseClientSsr();

  const { error } = await client.from('folders').delete().eq('id', folderId);

  if (error) {
    throw error;
  }

  revalidatePath('/');
}

export async function updateFolder(folderId: string, body: FoldersUpdate) {
  const client = await createClerkSupabaseClientSsr();

  const { error } = await client.from('folders').update(decamelizeKeys(body)).eq('id', folderId).select();

  if (error) {
    throw error;
  }

  revalidatePath('/');
}
