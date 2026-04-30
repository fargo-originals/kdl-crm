"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      {status === "enriching" && <Loader2 className="h-3 w-3 animate-spin" />}
      {LABELS[status] ?? status}
    </Badge>
  );
}
