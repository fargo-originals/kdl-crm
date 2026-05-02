import { NextRequest, NextResponse } from 'next/server';
import { getPublishedSnapshot } from '@/lib/landing/queries';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'es';

  try {
    const data = await getPublishedSnapshot(locale);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_LANDING_URL ?? '*',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
