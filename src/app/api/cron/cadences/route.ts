import { NextResponse } from 'next/server';
import { processPendingCadenceSteps } from '@/lib/cadences/engine';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 401 });
  }

  try {
    const processed = await processPendingCadenceSteps();
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error('[cron/cadences]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
