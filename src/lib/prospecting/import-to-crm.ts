import { supabaseServer } from "@/lib/supabase-server";

export type ProspectResultForImport = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  email: string | null;
  contact_name: string | null;
  contact_title: string | null;
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

export async function importProspectToCRM(
  result: ProspectResultForImport,
  userId: string
): Promise<{ contactId: string | null; companyId: string | null }> {
  let companyId: string | null = null;
  let contactId: string | null = null;

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
        industry: result.prospect_searches?.sector ?? null,
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

  return { contactId, companyId };
}
