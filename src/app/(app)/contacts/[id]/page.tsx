"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Building2, Pencil, X, Check } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import { CustomFieldsSection, type FieldDefinition } from "@/components/app/custom-fields/custom-fields-section";
import { waHref, buildWaMessage } from "@/lib/wa-link";
import { ActivityTimeline } from "@/components/app/activity-timeline";
import { Breadcrumb } from "@/components/app/breadcrumb";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  company_id: string | null;
  lifecycle_stage: string;
  status: string;
  notes: string | null;
  lead_score: number;
  custom_fields: Record<string, unknown>;
  created_at: string;
  company?: { id: string; name: string } | null;
}

const LIFECYCLE_LABELS: Record<string, string> = {
  lead: "Lead", opportunity: "Oportunidad", customer: "Cliente", inactive: "Inactivo",
};
const LIFECYCLE_VARIANTS: Record<string, "secondary" | "warning" | "success" | "default"> = {
  lead: "secondary", opportunity: "warning", customer: "success", inactive: "default",
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [customFieldDefs, setCustomFieldDefs] = useState<FieldDefinition[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/contacts/${id}`).then(r => r.json()),
      fetch("/api/settings/fields?object_type=contact").then(r => r.json()),
    ]).then(([contactData, fieldsData]) => {
      setContact(contactData);
      setForm(contactData);
      setCustomFieldDefs(Array.isArray(fieldsData) ? fieldsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!contact) return;
    setSaving(true);
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setContact(updated);
      setForm(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) return <PageSpinner containerClassName="py-24" />;
  if (!contact) return (
    <div className="text-center py-24">
      <p className="text-muted-foreground">Contacto no encontrado.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Volver</Button>
    </div>
  );

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const wa = waHref(contact.phone, buildWaMessage(contact.company?.name ?? fullName, false));

  const field = (label: string, key: keyof Contact, placeholder = "") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      {editing ? (
        <Input
          value={(form[key] as string) ?? ""}
          placeholder={placeholder}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ) : (
        <p className="text-sm py-2">{(contact[key] as string) || <span className="text-muted-foreground">—</span>}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Breadcrumb items={[{ label: "Contactos", href: "/contacts" }, { label: fullName }]} />
            <h1 className="text-3xl font-bold">{fullName}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              <Badge variant={LIFECYCLE_VARIANTS[contact.lifecycle_stage] ?? "default"}>
                {LIFECYCLE_LABELS[contact.lifecycle_stage] ?? contact.lifecycle_stage}
              </Badge>
              {contact.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />{contact.company.name}
                </span>
              )}
              {contact.job_title && <span>{contact.job_title}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-sm hover:text-primary">
                  <Mail className="h-3.5 w-3.5" />{contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-sm hover:text-primary">
                  <Phone className="h-3.5 w-3.5" />{contact.phone}
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
                  <FaWhatsapp className="h-3.5 w-3.5" />WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setForm(contact); setEditing(false); }} disabled={saving}>
                <X className="mr-2 h-4 w-4" />Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
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
        <Card>
          <CardHeader><CardTitle className="text-base">Información de contacto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {field("Nombre", "first_name", "Nombre")}
            {field("Apellido", "last_name", "Apellido")}
            {field("Email", "email", "email@empresa.com")}
            {field("Teléfono", "phone", "+34 600 000 000")}
            {field("Cargo", "job_title", "CEO, Director...")}
            {field("Departamento", "department", "Ventas, Marketing...")}
            <div className="space-y-1">
              <Label>Etapa</Label>
              {editing ? (
                <Select value={(form.lifecycle_stage as string) ?? ""} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })}>
                  <option value="lead">Lead</option>
                  <option value="opportunity">Oportunidad</option>
                  <option value="customer">Cliente</option>
                  <option value="inactive">Inactivo</option>
                </Select>
              ) : (
                <p className="text-sm py-2">{LIFECYCLE_LABELS[contact.lifecycle_stage] ?? contact.lifecycle_stage}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-none"
                placeholder="Notas sobre este contacto..."
                value={(form.notes as string) ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {contact.notes || <span className="text-muted-foreground">Sin notas.</span>}
              </p>
            )}
          </CardContent>
        </Card>

        {customFieldDefs.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">Campos personalizados</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <CustomFieldsSection
                  fields={customFieldDefs}
                  values={(form.custom_fields as Record<string, unknown>) ?? {}}
                  editing={editing}
                  onChange={(vals) => setForm({ ...form, custom_fields: vals })}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardContent className="pt-4">
          <ActivityTimeline filter={{ contact_id: id }} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Creado el {new Date(contact.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}
