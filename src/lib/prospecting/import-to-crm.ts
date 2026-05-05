import { supabaseServer } from "@/lib/supabase-server";
import { enqueueAgentRun } from "@/lib/agents";

export type ProspectResultForImport = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  email: string | null;
  contact_name: string | null;
  contact_title: string | null;
  category?: string | null;
  google_rating?: number | string | null;
  google_review_count?: number | null;
  prospect_searches?: { sector?: string | null } | null;
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "-" };
}

function domainFromWebsite(website: string | null) {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function detectChannel(result: ProspectResultForImport): 'email' | 'whatsapp' | 'phone' {
  if (result.email) return 'email';
  if (result.phone) {
    const digits = result.phone.replace(/\D/g, '');
    const local = digits.startsWith('34') ? digits.slice(2) : digits;
    if (local.startsWith('6') || local.startsWith('7')) return 'whatsapp';
  }
  return 'phone';
}

export async function importProspectToCRM(
  result: ProspectResultForImport,
  userId: string,
  autoContact = false
): Promise<{ contactId: string | null; companyId: string | null; leadId: string | null }> {
  let companyId: string | null = null;
  let contactId: string | null = null;
  let leadId: string | null = null;

  // --- Company ---
  const phoneMatch = result.phone
    ? await supabaseServer
        .from("companies")
        .select("id")
        .ilike("name", `%${result.name}%`)
        .eq("phone", result.phone)
        .maybeSingle()
    : { data: null };
  const websiteMatch =
    !phoneMatch.data && result.website
      ? await supabaseServer
          .from("companies")
          .select("id")
          .ilike("name", `%${result.name}%`)
          .eq("website", result.website)
          .maybeSingle()
      : { data: null };
  const existingCompany = phoneMatch.data ?? websiteMatch.data;

  if (existingCompany?.id) {
    companyId = existingCompany.id;
  } else {
    const { data: company, error } = await supabaseServer
      .from("companies")
      .insert({
        name: result.name,
        domain: domainFromWebsite(result.website),
        industry: result.prospect_searches?.sector ?? result.category ?? null,
        address: result.address,
        city: "Madrid",
        country: "España",
        phone: result.phone,
        website: result.website,
        owner_id: userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    companyId = company.id;
  }

  // --- Contact ---
  if (result.contact_name) {
    const { firstName, lastName } = splitName(result.contact_name);
    const { data: existingContact } = result.email
      ? await supabaseServer.from("contacts").select("id").eq("email", result.email).maybeSingle()
      : { data: null };

    if (existingContact?.id) {
      contactId = existingContact.id;
    } else {
      const { data: contact, error } = await supabaseServer
        .from("contacts")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: result.email,
          phone: result.phone,
          job_title: result.contact_title,
          company_id: companyId,
          owner_id: userId,
          source: "prospecting",
          lifecycle_stage: "lead",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      contactId = contact.id;
    }
  }

  // --- Lead inquiry ---
  if (result.email || result.phone) {
    const channel = detectChannel(result);
    const hasWebsite = Boolean(result.website);
    const fullName = result.contact_name ?? result.name;

    const { data: lead, error: leadError } = await supabaseServer
      .from("lead_inquiries")
      .insert({
        full_name: fullName,
        email: result.email ?? null,
        phone: result.phone ?? null,
        business_name: result.name,
        business_type: result.category ?? result.prospect_searches?.sector ?? null,
        service_interest: hasWebsite ? 'redesign' : 'new_website',
        message: hasWebsite
          ? `Negocio con web: ${result.website}`
          : 'Negocio sin web — importado desde prospección',
        preferred_channel: channel,
        status: 'new',
        locale: 'es',
        qualification_data: {
          source: 'apify_prospecting',
          has_website: hasWebsite,
          website_url: result.website ?? null,
          address: result.address ?? null,
          rating: result.google_rating ?? null,
          reviews_count: result.google_review_count ?? null,
        },
      })
      .select("id")
      .single();

    if (!leadError && lead) {
      leadId = lead.id;
      if (autoContact && (channel === 'email' || channel === 'whatsapp')) {
        enqueueAgentRun(lead.id).catch(() => {});
      }
    }
  }

  return { contactId, companyId, leadId };
}
