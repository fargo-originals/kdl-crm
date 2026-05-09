import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { CreateLandingBlogPostSchema } from '@/lib/landing/schemas';
import { supabaseServer } from '@/lib/supabase-server';
import { validateJsonBody } from '@/lib/validation';

const TABLE = 'landing_blog_posts';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseServer
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const validated = await validateJsonBody(req, CreateLandingBlogPostSchema);
  if ('response' in validated) return validated.response;

  const { data, error } = await supabaseServer
    .from(TABLE)
    .insert({ ...validated.data, author_id: session.sub })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
