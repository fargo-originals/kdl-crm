"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const LABELS: Record<string, string> = {
  pending: "Pendiente",
  enriching: "Enriqueciendo",
  done: "Completo",
  failed: "Error",
};

const VARIANTS: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  pending: "secondary",
  enriching: "warning",
  done: "success",
  failed: "destructive",
};

export function EnrichmentBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "secondary"} className="gap-1">
      {status === "enriching" && <Spinner size="xs" tone="current" />}
      {LABELS[status] ?? status}
    </Badge>
  );
}
