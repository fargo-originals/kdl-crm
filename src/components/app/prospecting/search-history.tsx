import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProspectSearch } from "@/components/app/prospecting/types";

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  pending: "secondary",
  searching: "warning",
  enriching: "warning",
  done: "success",
  failed: "destructive",
};

export function SearchHistory({ searches }: { searches: ProspectSearch[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Todavia no hay busquedas de prospeccion.</p>
        ) : (
          <div className="divide-y">
            {searches.map((search) => (
              <Link
                key={search.id}
                href={`/prospecting/${search.id}`}
                className="flex items-center justify-between gap-4 py-4 hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="font-medium">{search.keywords}</p>
                  <p className="text-sm text-muted-foreground">
                    {search.total_results ?? 0} resultados · {search.enriched_count ?? 0} enriquecidos ·{" "}
                    {formatDistanceToNow(new Date(search.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={STATUS_VARIANT[search.status] ?? "secondary"}>{search.status}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
