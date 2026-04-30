import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ResultsTable } from "@/components/app/prospecting/results-table";
import type { SearchResultsPayload } from "@/components/app/prospecting/types";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";
import { supabaseServer } from "@/lib/supabase-server";

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  pending: "secondary",
  searching: "warning",
  enriching: "warning",
  done: "success",
  failed: "destructive",
};

export default async function SearchResultsPage({ params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params;
  const { dbUserId } = await getCurrentDbUserId();
  if (!dbUserId) notFound();

  const { data: search } = await supabaseServer
    .from("prospect_searches")
    .select("*")
    .eq("id", searchId)
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (!search) notFound();

  const { data: results } = await supabaseServer
    .from("prospect_results")
    .select("*")
    .eq("search_id", searchId)
    .order("created_at", { ascending: true });

  const payload = { search, results: results ?? [] } as SearchResultsPayload;
  const total = payload.results.length;
  const completed = payload.results.filter((result) => ["done", "failed"].includes(result.enrichment_status)).length;
  const approved = payload.results.filter((result) => result.review_status === "approved").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{search.keywords}</h1>
          <p className="text-muted-foreground">
            {search.zone} · {search.sector}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[search.status] ?? "secondary"}>{search.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Resultados</p>
            <p className="text-2xl font-semibold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Enriquecidos</p>
            <p className="text-2xl font-semibold">{completed}/{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Aprobados</p>
            <p className="text-2xl font-semibold">{approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Importados</p>
            <p className="text-2xl font-semibold">{search.imported_count ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%" }}
        />
      </div>

      <ResultsTable initialData={payload} />
    </div>
  );
}
