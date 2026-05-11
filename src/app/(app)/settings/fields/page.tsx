"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import type { FieldDefinition } from "@/components/app/custom-fields/custom-fields-section";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  number: "Número",
  date: "Fecha",
  select: "Lista de opciones",
  checkbox: "Casilla (Sí/No)",
};

const OBJECT_TYPES = [
  { value: "contact", label: "Contactos" },
  { value: "company", label: "Empresas" },
];

const emptyForm = {
  object_type: "contact",
  name: "",
  label: "",
  field_type: "text",
  options_raw: "",
  is_required: false,
};

export default function FieldsSettingsPage() {
  const [activeTab, setActiveTab] = useState<"contact" | "company">("contact");
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadFields(type: string) {
    setLoading(true);
    const res = await fetch(`/api/settings/fields?object_type=${type}`);
    const data = await res.json();
    setFields(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadFields(activeTab); }, [activeTab]);

  function openModal() {
    setForm({ ...emptyForm, object_type: activeTab });
    setOpen(true);
  }

  function slugify(label: string) {
    return label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  async function handleCreate() {
    if (!form.label.trim()) return;
    setSaving(true);

    const name = form.name.trim() || slugify(form.label);
    const options = form.field_type === "select"
      ? form.options_raw.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
          const [value, ...rest] = line.split(":");
          return { value: value.trim(), label: rest.join(":").trim() || value.trim() };
        })
      : [];

    const res = await fetch("/api/settings/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object_type: form.object_type,
        name,
        label: form.label,
        field_type: form.field_type,
        options,
        is_required: form.is_required,
      }),
    });

    if (res.ok) {
      setOpen(false);
      await loadFields(activeTab);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/settings/fields/${id}`, { method: "DELETE" });
    await loadFields(activeTab);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campos personalizados</h1>
        <p className="text-muted-foreground">Define campos extra para contactos y empresas según tu sector</p>
      </div>

      <div className="flex gap-2 border-b">
        {OBJECT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value as "contact" | "company")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Campos de {activeTab === "contact" ? "Contactos" : "Empresas"}
            </CardTitle>
            <CardDescription>
              Estos campos aparecerán en el formulario de edición de cada {activeTab === "contact" ? "contacto" : "empresa"}
            </CardDescription>
          </div>
          <Button size="sm" onClick={openModal}>
            <Plus className="mr-2 h-4 w-4" />Nuevo campo
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageSpinner containerClassName="py-8" />
          ) : fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No hay campos personalizados todavía</p>
              <p className="text-xs mt-1">Crea campos como "Tipo de cocina", "Especialidad", "Número de habitaciones"...</p>
            </div>
          ) : (
            <div className="divide-y">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{field.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{field.name}</p>
                    </div>
                    <Badge variant="secondary">{FIELD_TYPE_LABELS[field.field_type]}</Badge>
                    {field.is_required && <Badge variant="destructive" className="text-xs">Requerido</Badge>}
                    {field.field_type === "select" && field.options.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {field.options.length} opción{field.options.length !== 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo campo personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre visible *</Label>
              <Input
                placeholder="Ej: Tipo de cocina, Especialidad..."
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
              {form.label && (
                <p className="text-xs text-muted-foreground">
                  Clave interna: <span className="font-mono">{slugify(form.label)}</span>
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Tipo de campo</Label>
              <Select
                value={form.field_type}
                onChange={(e) => setForm({ ...form, field_type: e.target.value })}
              >
                {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            {form.field_type === "select" && (
              <div className="space-y-1">
                <Label>Opciones (una por línea)</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-none"
                  placeholder={"italiana\nmediterránea\nasiatica\nfusión"}
                  value={form.options_raw}
                  onChange={(e) => setForm({ ...form, options_raw: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Puedes usar formato <span className="font-mono">valor:Etiqueta</span> para claves distintas al texto visible
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_required"
                className="h-4 w-4 rounded border-input"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              />
              <Label htmlFor="is_required" className="cursor-pointer font-normal">Campo requerido</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.label.trim()}>
              {saving ? <><Spinner size="sm" tone="current" className="mr-2" />Guardando...</> : "Crear campo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
