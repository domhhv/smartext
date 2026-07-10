import { useSession } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import * as React from 'react';

import type { Database } from '@db-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export default function useClerkSupabaseClient() {
  const { session } = useSession();

  return React.useMemo(() => {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    return createClient<Database>(supabaseUrl, supabaseKey, {
      accessToken: async () => {
        return (await session?.getToken()) ?? null;
      },
    });
  }, [session]);
}
