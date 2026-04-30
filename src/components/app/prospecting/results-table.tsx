"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImportButton } from "@/components/app/prospecting/import-button";
import { ResultRow } from "@/components/app/prospecting/result-row";
import type { SearchResultsPayload } from "@/components/app/prospecting/types";

async function fetchSearchResults(searchId: string): Promise<SearchResultsPayload> {
  const response = await fetch(`/api/prospecting/searches/${searchId}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar resultados");
  return payload.data as SearchResultsPayload;
}

export function ResultsTable({ initialData }: { initialData: SearchResultsPayload }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["prospecting", "results", initialData.search.id],
    queryFn: () => fetchSearchResults(initialData.search.id),
    initialData,
    refetchInterval: (currentQuery) => {
      const data = currentQuery.state.data as SearchResultsPayload | undefined;
      if (!data) return false;
      // Parar si la búsqueda ya terminó (señal autoritativa del webhook)
      if (data.search.status === "done" || data.search.status === "failed") return false;
      // Parar si ningún resultado sigue enriqueciendo
      return data.results.some((result) => result.enrichment_status === "enriching") ? 10000 : false;
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
  const importIds = selectedIds.filter((id) => approvedIds.includes(id));
  const allSelectableIds = data.results
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
            <Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={() => bulkReview("approved")}>
              <Check className="mr-2 h-4 w-4" />
              Aprobar
            </Button>
            <Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={() => bulkReview("discarded")}>
              <X className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            <ImportButton searchId={data.search.id} resultIds={importIds.length > 0 ? importIds : approvedIds} />
          </div>
        </div>

        {data.results.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay resultados para esta busqueda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-10 px-0 py-3" />
                  <th className="py-3 pr-4">Negocio</th>
                  <th className="py-3 pr-4">Contacto</th>
                  <th className="py-3 pr-4">Enriquecimiento</th>
                  <th className="py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((result) => (
                  <ResultRow
                    key={result.id}
                    result={result}
                    selected={selectedIds.includes(result.id)}
                    onSelect={(selected) => setSelected(result.id, selected)}
                    onReview={(status) => reviewMutation.mutate({ resultId: result.id, status })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
