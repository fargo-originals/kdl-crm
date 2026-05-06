"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Download, Loader2 } from "lucide-react";
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
  const [autoContact, setAutoContact] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/prospecting/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultIds, autoContact }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo importar");
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prospecting", "results", searchId] });
    },
  });

  const isDisabled = disabled || resultIds.length === 0 || mutation.isPending;

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={autoContact}
          onChange={e => setAutoContact(e.target.checked)}
          className="h-3.5 w-3.5 rounded border"
          disabled={isDisabled}
        />
        <Bot className="h-3.5 w-3.5" />
        Contactar con IA
      </label>
      <Button
        onClick={() => mutation.mutate()}
        disabled={isDisabled}
        variant="secondary"
      >
        {mutation.isPending
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <Download className="mr-2 h-4 w-4" />}
        Importar aprobados
      </Button>
    </div>
  );
}
