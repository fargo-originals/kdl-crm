import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getCurrentDbUserId } from '@/lib/prospecting/auth';
import { CreateCampaignSchema } from '@/lib/campaigns/schemas';
import { renderTemplate } from '@/lib/campaigns/templates';

export async function GET() {
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data, error: dbError } = await supabaseServer
    .from('email_campaigns')
    .select('*')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { name, sector, tono, templateType, subject, bodyHtml } = parsed.data;

  // Si se manda templateType pero no bodyHtml propio, generar preview con vars demo
  let finalBodyHtml = bodyHtml;
  if (!bodyHtml || bodyHtml.trim() === '') {
    const demo = renderTemplate(templateType, sector as Parameters<typeof renderTemplate>[1], {
      firstName: 'María',
      businessName: name,
      neighborhood: 'tu barrio',
      rating: '4.8',
      reviewCount: '120',
    });
    finalBodyHtml = demo.bodyHtml;
  }

  const { data, error: dbError } = await supabaseServer
    .from('email_campaigns')
    .insert({
      user_id: dbUserId,
      name,
      sector,
      tono,
      template_type: templateType,
      subject,
      body_html: finalBodyHtml,
      status: 'draft',
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
