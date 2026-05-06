"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Globe, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImportButton } from "@/components/app/prospecting/import-button";
import { ResultCard } from "@/components/app/prospecting/result-card";
import { classifyWebsite } from "@/lib/prospecting/classify-website";
import type { SearchResultsPayload } from "@/components/app/prospecting/types";

async function fetchSearchResults(searchId: string): Promise<SearchResultsPayload> {
  const response = await fetch(`/api/prospecting/searches/${searchId}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar resultados");
  return payload.data as SearchResultsPayload;
}

const AUTO_SYNC_AFTER_MS = 3 * 60 * 1000; // 3 minutos sin webhook → sync automático

async function syncSearch(searchId: string): Promise<void> {
  await fetch("/api/prospecting/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchId }),
  });
}

export function ResultsTable({ initialData }: { initialData: SearchResultsPayload }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hideWithRealWeb, setHideWithRealWeb] = useState(false);
  const queryClient = useQueryClient();
  const syncedRef = useRef(false);
  const enrichingStartRef = useRef<number>(Date.now());

  const syncMutation = useMutation({
    mutationFn: () => syncSearch(initialData.search.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prospecting", "results", initialData.search.id] });
    },
  });

  const query = useQuery({
    queryKey: ["prospecting", "results", initialData.search.id],
    queryFn: () => fetchSearchResults(initialData.search.id),
    initialData,
    refetchInterval: (currentQuery) => {
      const data = currentQuery.state.data as SearchResultsPayload | undefined;
      if (!data) return false;
      const status = data.search.status;
      if (status === "done" || status === "failed") return false;
      // Poll while searching OR enriching — webhook may not arrive
      if (!syncedRef.current && Date.now() - enrichingStartRef.current > AUTO_SYNC_AFTER_MS) {
        syncedRef.current = true;
        syncMutation.mutate();
      }
      return 10000;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ resultId, status }: { resultId: string; status: "approved" | "discarded" | "pending" }) => {
      const response = await fetch(`/api/prospecting/results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar");
      return payload.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prospecting", "results", initialData.search.id] });
    },
  });

  const data = query.data;

  const approvedIds = useMemo(
    () =>
      data.results
        .filter((result) => result.review_status === "approved" && !result.imported_at)
        .map((result) => result.id),
    [data.results]
  );

  const visibleResults = useMemo(() =>
    hideWithRealWeb
      ? data.results.filter(r => classifyWebsite(r.website).presence !== 'real_website')
      : data.results,
    [data.results, hideWithRealWeb]
  );

  const realWebIds = useMemo(
    () => data.results
      .filter(r => classifyWebsite(r.website).presence === 'real_website' && !r.imported_at)
      .map(r => r.id),
    [data.results]
  );

  const importIds = selectedIds.filter((id) => approvedIds.includes(id));
  const allSelectableIds = visibleResults
    .filter((result) => result.review_status !== "discarded" && !result.imported_at)
    .map((result) => result.id);

  function setSelected(resultId: string, selected: boolean) {
    setSelectedIds((current) =>
      selected ? [...new Set([...current, resultId])] : current.filter((id) => id !== resultId)
    );
  }

  function bulkReview(status: "approved" | "discarded") {
    for (const resultId of selectedIds) {
      reviewMutation.mutate({ resultId, status });
    }
    setSelectedIds([]);
  }

  function discardAllWithRealWeb() {
    for (const resultId of realWebIds) {
      reviewMutation.mutate({ resultId, status: "discarded" });
    }
  }

  const isInProgress = data.search.status !== "done" && data.search.status !== "failed";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => bulkReview("approved")}>
                <Check className="h-3 w-3" /> Aprobar ({selectedIds.length})
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => bulkReview("discarded")}>
                <X className="h-3 w-3" /> Descartar ({selectedIds.length})
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelectedIds([])}>
                Deseleccionar
              </Button>
            </>
          )}
          {selectedIds.length === 0 && allSelectableIds.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(allSelectableIds)}>
              Seleccionar todos ({allSelectableIds.length})
            </Button>
          )}
          {realWebIds.length > 0 && (
            <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={discardAllWithRealWeb}>
              <Globe className="h-3 w-3" /> Descartar con web real ({realWebIds.length})
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-muted-foreground"
            onClick={() => setHideWithRealWeb(v => !v)}
          >
            <Globe className="h-3 w-3" /> {hideWithRealWeb ? 'Mostrar todos' : 'Ocultar con web real'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isInProgress && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {data.search.status === "searching" ? "Buscando en Google Maps..." : "Enriqueciendo datos..."}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          {importIds.length > 0 && (
            <ImportButton resultIds={importIds} searchId={initialData.search.id} />
          )}
        </div>
      </div>

      {/* Results */}
      {data.results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isInProgress ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Buscando negocios... Los resultados aparecerán aquí cuando Apify finalice.</p>
              </div>
            ) : (
              <p>No se encontraron resultados para esta búsqueda.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleResults.map((result) => (
            <ResultCard
              key={result.id}
              result={result}
              selected={selectedIds.includes(result.id)}
              onSelect={(selected) => setSelected(result.id, selected)}
              onReview={(status) => reviewMutation.mutate({ resultId: result.id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
