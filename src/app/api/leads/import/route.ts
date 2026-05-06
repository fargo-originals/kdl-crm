import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { enqueueAgentRun } from '@/lib/agents';

export interface ApifyLeadRow {
  business_name: string;
  phone?: string;
  email?: string;
  business_type?: string;
  has_website: boolean;
  website_url?: string;
  address?: string;
  maps_url?: string;
  rating?: number;
  reviews_count?: number;
}

function detectChannel(row: ApifyLeadRow): 'email' | 'whatsapp' | 'phone' {
  if (row.email) return 'email';
  if (row.phone) {
    // Spanish mobile numbers start with 6 or 7 (whatsapp-capable)
    const digits = row.phone.replace(/\D/g, '');
    const local = digits.startsWith('34') ? digits.slice(2) : digits;
    if (local.startsWith('6') || local.startsWith('7')) return 'whatsapp';
  }
  return 'phone';
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { leads: ApifyLeadRow[]; auto_contact: boolean };
  const { leads, auto_contact = false } = body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'leads array required' }, { status: 400 });
  }

  const results = { imported: 0, skipped: 0, errors: 0 };

  for (const row of leads) {
    if (!row.business_name) { results.skipped++; continue; }

    const channel = detectChannel(row);

    // Skip if no contact method at all
    if (!row.email && !row.phone) { results.skipped++; continue; }

    const leadData = {
      full_name: row.business_name,
      email: row.email || null,
      phone: row.phone || null,
      business_name: row.business_name,
      business_type: row.business_type || null,
      service_interest: row.has_website ? 'redesign' : 'new_website',
      message: row.has_website
        ? `Negocio con web existente: ${row.website_url ?? ''}`.trim()
        : 'Negocio sin web — prospecto Apify',
      preferred_channel: channel,
      status: 'new',
      locale: 'es',
      qualification_data: {
        source: 'apify_google_maps',
        has_website: row.has_website,
        website_url: row.website_url ?? null,
        address: row.address ?? null,
        maps_url: row.maps_url ?? null,
        rating: row.rating ?? null,
        reviews_count: row.reviews_count ?? null,
      },
    };

    const { data: lead, error } = await supabaseServer
      .from('lead_inquiries')
      .insert(leadData)
      .select('id')
      .single();

    if (error) { results.errors++; continue; }

    if (auto_contact && (channel === 'email' || channel === 'whatsapp')) {
      enqueueAgentRun(lead.id).catch(() => {});
    }

    results.imported++;
  }

  return NextResponse.json({ ok: true, results });
}
