import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: user } = await supabaseServer
    .from('users')
    .select('first_name, last_name, booking_title, slot_duration_minutes, avatar_url')
    .eq('booking_slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
    title: user.booking_title ?? 'Consulta gratuita',
    duration: user.slot_duration_minutes ?? 30,
    avatar_url: user.avatar_url ?? null,
  });
}
