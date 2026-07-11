import { verifyWebhook } from '@clerk/nextjs/webhooks';
import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';

import createSupabaseAdminClient from '@/lib/utils/create-supabase-admin-client';
import removeStoragePrefix from '@/lib/utils/remove-storage-prefix';

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch (error) {
    Sentry.captureException(error);
    console.error('Clerk webhook verification failed: ', error);

    return new Response('Verification failed', { status: 400 });
  }

  if (event.type === 'user.deleted' && event.data.id) {
    const userId = event.data.id;
    const client = createSupabaseAdminClient();

    await removeStoragePrefix(client, userId);

    const { error: documentsError } = await client.from('documents').delete().eq('user_id', userId);

    if (documentsError) {
      Sentry.captureException(documentsError);
      console.error('Error removing documents of deleted user: ', documentsError);

      return new Response('Failed to remove user documents', { status: 500 });
    }

    const { error: foldersError } = await client.from('folders').delete().eq('user_id', userId);

    if (foldersError) {
      Sentry.captureException(foldersError);
      console.error('Error removing folders of deleted user: ', foldersError);

      return new Response('Failed to remove user folders', { status: 500 });
    }
  }

  return new Response('OK', { status: 200 });
}
