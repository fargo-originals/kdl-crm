"use client";

import { AtSign, Check, ExternalLink, Globe, Mail, Phone, Share2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnrichmentBadge } from "@/components/app/prospecting/enrichment-badge";
import { classifyWebsite } from "@/lib/prospecting/classify-website";
import type { ProspectResult } from "@/components/app/prospecting/types";

type ResultCardProps = {
  result: ProspectResult;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onReview: (status: "approved" | "discarded" | "pending") => void;
};

export function ResultCard({ result, selected, onSelect, onReview }: ResultCardProps) {
  const imported = Boolean(result.imported_at);
  const approved = result.review_status === "approved";
  const discarded = result.review_status === "discarded";
  const web = classifyWebsite(result.website);

  return (
    <div className={`relative flex flex-col rounded-lg border bg-card text-sm transition-colors ${
      discarded ? "opacity-50" : imported ? "border-primary/30 bg-primary/5" : approved ? "border-green-300 bg-green-50/30 dark:bg-green-950/10" : ""
    }`}>
      {/* Checkbox top-left */}
      <div className="absolute left-2 top-2 z-10">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-input"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          disabled={discarded || imported}
          aria-label={`Seleccionar ${result.name}`}
        />
      </div>

      {/* Logo / thumbnail */}
      <div className="h-20 w-full overflow-hidden rounded-t-lg bg-muted flex items-center justify-center shrink-0">
        {result.logo_url ? (
          <img
            src={result.logo_url}
            alt={result.name}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="text-2xl font-bold text-muted-foreground/30 select-none">
            {result.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 pt-2">
        {/* Name + status badges */}
        <div>
          <p className="font-semibold leading-snug line-clamp-2" title={result.name}>{result.name}</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {imported && <Badge className="text-[10px] px-1 py-0">Importado</Badge>}
            {approved && !imported && <Badge variant="success" className="text-[10px] px-1 py-0">Aprobado</Badge>}
            {discarded && <Badge variant="destructive" className="text-[10px] px-1 py-0">Descartado</Badge>}
          </div>
        </div>

        {/* Category + rating */}
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {result.category && <span className="truncate max-w-full">{result.category}</span>}
          {result.google_rating && (
            <span className="shrink-0 font-medium text-amber-600">{result.google_rating}★</span>
          )}
        </div>

        {/* Address */}
        {result.address && (
          <p className="text-[11px] text-muted-foreground line-clamp-1" title={result.address ?? undefined}>
            {result.address}
          </p>
        )}

        {/* Contact */}
        <div className="space-y-1">
          {result.phone && (
            <a href={`tel:${result.phone}`} className="flex items-center gap-1.5 text-[11px] hover:text-primary truncate">
              <Phone className="h-3 w-3 shrink-0" />{result.phone}
            </a>
          )}
          {result.email && (
            <a href={`mailto:${result.email}`} className="flex items-center gap-1.5 text-[11px] hover:text-primary truncate">
              <Mail className="h-3 w-3 shrink-0" />{result.email}
            </a>
          )}
          {result.instagram && (
            <a
              href={`https://instagram.com/${result.instagram.replace(/^@/, "")}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-[11px] hover:text-primary truncate"
            >
              <AtSign className="h-3 w-3 shrink-0" />@{result.instagram.replace(/^@/, "")}
            </a>
          )}
        </div>

        {/* Web badge */}
        <div className="mt-auto pt-1">
          {web.presence === "real_website" && (
            <a href={web.url!} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-200">
              <Globe className="h-2.5 w-2.5" />Web propia<ExternalLink className="h-2 w-2 opacity-60" />
            </a>
          )}
          {web.presence === "social_only" && (
            <a href={web.url!} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 hover:bg-yellow-200">
              <Share2 className="h-2.5 w-2.5" />{web.label}<ExternalLink className="h-2 w-2 opacity-60" />
            </a>
          )}
          {web.presence === "none" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
              <Globe className="h-2.5 w-2.5" />Sin web
            </span>
          )}
        </div>

        <EnrichmentBadge status={result.enrichment_status} />
        {result.contact_name && (
          <p className="text-[11px] text-muted-foreground truncate">
            {result.contact_name}{result.contact_title && ` · ${result.contact_title}`}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1 border-t px-2 py-1.5">
        <Button
          size="icon"
          variant={approved ? "default" : "outline"}
          className="h-6 w-6"
          onClick={() => onReview(approved ? "pending" : "approved")}
          disabled={imported}
          title={approved ? "Quitar aprobación" : "Aprobar"}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant={discarded ? "destructive" : "outline"}
          className="h-6 w-6"
          onClick={() => onReview(discarded ? "pending" : "discarded")}
          disabled={imported}
          title={discarded ? "Restaurar" : "Descartar"}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
