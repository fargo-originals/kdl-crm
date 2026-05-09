import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { UpdateLandingBlogPostSchema } from '@/lib/landing/schemas';
import { supabaseServer } from '@/lib/supabase-server';
import { validateJsonBody } from '@/lib/validation';

const TABLE = 'landing_blog_posts';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabaseServer.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const validated = await validateJsonBody(req, UpdateLandingBlogPostSchema);
  if ('response' in validated) return validated.response;

  const updates: Record<string, unknown> = { ...validated.data, updated_at: new Date().toISOString() };
  if (validated.data.status === 'published' && !validated.data.published_at) {
    updates.published_at = new Date().toISOString();
  }
  const { data, error } = await supabaseServer.from(TABLE).update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { error } = await supabaseServer.from(TABLE).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
