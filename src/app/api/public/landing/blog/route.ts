import { NextRequest, NextResponse } from 'next/server';
import { getPublishedBlogPosts } from '@/lib/landing/queries';

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'es';
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');
  const tag = req.nextUrl.searchParams.get('tag') ?? undefined;

  try {
    const posts = await getPublishedBlogPosts(locale, page, tag);
    return NextResponse.json(posts, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
