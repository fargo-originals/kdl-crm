import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function getCurrentDbUserId() {
  const session = await getSession();
  if (!session) return { dbUserId: null, error: 'Unauthorized' };

  const { data, error } = await supabaseServer
    .from('users')
    .select('id')
    .eq('id', session.sub)
    .maybeSingle();

  if (error) return { dbUserId: null, error: error.message };
  if (!data?.id) return { dbUserId: null, error: 'User not found' };

  return { dbUserId: data.id as string, error: null };
}
