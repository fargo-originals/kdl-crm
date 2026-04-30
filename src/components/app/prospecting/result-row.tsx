"use client";

import { AtSign, Check, ExternalLink, Mail, Phone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnrichmentBadge } from "@/components/app/prospecting/enrichment-badge";
import type { ProspectResult } from "@/components/app/prospecting/types";

type ResultRowProps = {
  result: ProspectResult;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onReview: (status: "approved" | "discarded" | "pending") => void;
};

export function ResultRow({ result, selected, onSelect, onReview }: ResultRowProps) {
  const imported = Boolean(result.imported_at);
  const approved = result.review_status === "approved";
  const discarded = result.review_status === "discarded";

  return (
    <tr className="border-b align-top last:border-0">
      <td className="w-10 py-4 pr-3">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={selected}
          onChange={(event) => onSelect(event.target.checked)}
          disabled={discarded || imported}
          aria-label={`Seleccionar ${result.name}`}
        />
      </td>
      <td className="py-4 pr-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium leading-none">{result.name}</p>
            {imported && <Badge>Importado</Badge>}
            {approved && !imported && <Badge variant="success">Aprobado</Badge>}
            {discarded && <Badge variant="destructive">Descartado</Badge>}
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{result.address ?? "Sin direccion"}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {result.category && <span>{result.category}</span>}
            {result.google_rating && <span>{result.google_rating} Google</span>}
            {typeof result.google_review_count === "number" && <span>{result.google_review_count} resenas</span>}
          </div>
        </div>
      </td>
      <td className="py-4 pr-4">
        <div className="space-y-2 text-sm">
          {result.phone && (
            <a className="flex items-center gap-2 hover:text-primary" href={`tel:${result.phone}`}>
              <Phone className="h-4 w-4" />
              {result.phone}
            </a>
          )}
          {result.email && (
            <a className="flex items-center gap-2 hover:text-primary" href={`mailto:${result.email}`}>
              <Mail className="h-4 w-4" />
              {result.email}
            </a>
          )}
          {result.instagram && (
            <a
              className="flex items-center gap-2 hover:text-primary"
              href={`https://instagram.com/${result.instagram}`}
              target="_blank"
              rel="noreferrer"
            >
              <AtSign className="h-4 w-4" />
              @{result.instagram}
            </a>
          )}
          {result.website && (
            <a
              className="flex items-center gap-2 hover:text-primary"
              href={result.website}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Web
            </a>
          )}
        </div>
      </td>
      <td className="py-4 pr-4">
        <div className="space-y-2">
          <EnrichmentBadge status={result.enrichment_status} />
          {result.contact_name && (
            <p className="text-sm">
              {result.contact_name}
              {result.contact_title && <span className="text-muted-foreground"> · {result.contact_title}</span>}
            </p>
          )}
        </div>
      </td>
      <td className="py-4">
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => onReview(approved ? "pending" : "approved")}
            disabled={imported}
            title={approved ? "Quitar aprobacion" : "Aprobar"}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onReview(discarded ? "pending" : "discarded")}
            disabled={imported}
            title={discarded ? "Restaurar" : "Descartar"}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
