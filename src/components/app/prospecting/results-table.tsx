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
      if (data.search.status === "done" || data.search.status === "failed") return false;
      const isEnriching = data.results.some((r) => r.enrichment_status === "enriching");
      if (!isEnriching) return false;
      // Fallback: si lleva más de 3 min enriqueciendo y el webhook no llegó, sync automático
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

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={allSelectableIds.length > 0 && selectedIds.length === allSelectableIds.length}
                onChange={(event) => setSelectedIds(event.target.checked ? allSelectableIds : [])}
              />
              {selectedIds.length} seleccionados
            </label>
            {query.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.search.status === "enriching" && (
              <Button size="sm" variant="outline" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
                {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar con Apify
              </Button>
            )}
            {realWebIds.length > 0 && (
              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={discardAllWithRealWeb} disabled={reviewMutation.isPending}>
                <Globe className="mr-2 h-4 w-4" />
                Descartar con web propia ({realWebIds.length})
              </Button>
            )}
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none border rounded-md px-3 py-1.5 hover:bg-accent">
              <input
                type="checkbox"
                checked={hideWithRealWeb}
                onChange={e => setHideWithRealWeb(e.target.checked)}
                className="h-3.5 w-3.5 rounded border"
              />
              Solo sin web propia
            </label>
            <Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={() => bulkReview("approved")}>
              <Check className="mr-2 h-4 w-4" /> Aprobar
            </Button>
            <Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={() => bulkReview("discarded")}>
              <X className="mr-2 h-4 w-4" /> Descartar
            </Button>
            <ImportButton searchId={data.search.id} resultIds={importIds.length > 0 ? importIds : approvedIds} />
          </div>
        </div>

        {data.results.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay resultados para esta busqueda.</div>
        ) : (
          <div className="p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
