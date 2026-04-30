import { SearchForm } from "@/components/app/prospecting/search-form";
import { SearchHistory } from "@/components/app/prospecting/search-history";
import type { ProspectSearch } from "@/components/app/prospecting/types";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";
import { supabaseServer } from "@/lib/supabase-server";

export default async function ProspectingPage() {
  const { dbUserId } = await getCurrentDbUserId();
  const { data } = dbUserId
    ? await supabaseServer
        .from("prospect_searches")
        .select("*")
        .eq("user_id", dbUserId)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prospeccion</h1>
        <p className="text-muted-foreground">Busca negocios locales, revisa datos enriquecidos e importalos al CRM.</p>
      </div>
      <SearchForm />
      <SearchHistory searches={(data ?? []) as ProspectSearch[]} />
    </div>
  );
}
