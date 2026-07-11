import { createClient } from '@supabase/supabase-js';

import type { Database } from '@db-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

export default function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
    },
  });
}
