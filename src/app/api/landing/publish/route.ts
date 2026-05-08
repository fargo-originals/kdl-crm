import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { revalidateLanding } from '@/lib/landing/revalidate';

export async function POST() {
  await requireAdmin();

  // Sync published_value from value in landing_settings
  const { data: settings } = await supabaseServer.from('landing_settings').select('id, value');
  for (const s of settings ?? []) {
    await supabaseServer
      .from('landing_settings')
      .update({ published_value: s.value, updated_at: new Date().toISOString() })
      .eq('id', s.id);
  }

  // Trigger ISR revalidation on the landing site
  await revalidateLanding();

  return NextResponse.json({ ok: true, revalidated: ['landing:snapshot', 'landing:blog'] });
}
