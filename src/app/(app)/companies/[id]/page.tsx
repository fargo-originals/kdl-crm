"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, MapPin, Phone, Loader2, Pencil, X, Check } from "lucide-react";

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  revenue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const industries = ["Restauración", "Hostelería", "Tecnología", "Salud", "Educación", "Finanzas", "Retail", "Manufactura", "Consultoría", "Marketing", "Legal", "Otro"];
const sizes = [
  { value: "1-10", label: "1-10 empleados" },
  { value: "11-50", label: "11-50 empleados" },
  { value: "50-200", label: "50-200 empleados" },
  { value: "200+", label: "200+ empleados" },
];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Company>>({});

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCompany(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!company) return;
    setSaving(true);
    const res = await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setCompany(updated);
      setForm(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  function handleCancel() {
    setForm(company ?? {});
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Empresa no encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  const field = (label: string, key: keyof Company, placeholder = "") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      {editing ? (
        <Input
          value={(form[key] as string) ?? ""}
          placeholder={placeholder}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ) : (
        <p className="text-sm py-2">{(company[key] as string) || <span className="text-muted-foreground">—</span>}</p>
      )}
    </div>
  );

  const selectField = (label: string, key: keyof Company, options: { value: string; label: string }[]) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      {editing ? (
        <Select value={(form[key] as string) ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
          <option value="">Seleccionar...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      ) : (
        <p className="text-sm py-2">{(company[key] as string) || <span className="text-muted-foreground">—</span>}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              {company.industry && <Badge variant="secondary">{company.industry}</Badge>}
              {company.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[company.city, company.country].filter(Boolean).join(", ")}</span>}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                  <Globe className="h-3 w-3" />{company.domain ?? company.website}
                </a>
              )}
              {company.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{company.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="mr-2 h-4 w-4" />Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Datos generales */}
        <Card>
          <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {field("Nombre", "name", "Nombre de la empresa")}
            {field("Dominio", "domain", "empresa.com")}
            {field("Website", "website", "https://...")}
            {editing
              ? <div className="space-y-1">
                  <Label>Industria</Label>
                  <Select value={(form.industry as string) ?? ""} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                  </Select>
                </div>
              : <div className="space-y-1"><Label>Industria</Label><p className="text-sm py-2">{company.industry || <span className="text-muted-foreground">—</span>}</p></div>
            }
            {selectField("Tamaño", "size", sizes)}
          </CardContent>
        </Card>

        {/* Contacto y ubicación */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contacto y ubicación</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {field("Teléfono", "phone", "+34 600 000 000")}
            {field("Dirección", "address", "Calle Mayor 1")}
            {field("Ciudad", "city", "Madrid")}
            {field("País", "country", "España")}
          </CardContent>
        </Card>

        {/* Observaciones */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={(form.notes as string) ?? ""}
                placeholder="Ej: Página web antigua, solo tienen presencia en Instagram, dueño muy receptivo..."
                rows={5}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {company.notes || <span className="text-muted-foreground">Sin observaciones todavía. Pulsa Editar para añadir notas.</span>}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Creada el {new Date(company.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
        {company.updated_at !== company.created_at && ` · Actualizada el ${new Date(company.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`}
      </p>
    </div>
  );
}
