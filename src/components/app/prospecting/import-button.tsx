"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportButton({
  searchId,
  resultIds,
  disabled,
}: {
  searchId: string;
  resultIds: string[];
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/prospecting/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo importar");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prospecting", "results", searchId] });
    },
  });

  return (
    <Button
      onClick={() => mutation.mutate()}
      disabled={disabled || resultIds.length === 0 || mutation.isPending}
      variant="secondary"
    >
      {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Importar aprobados
    </Button>
  );
}
