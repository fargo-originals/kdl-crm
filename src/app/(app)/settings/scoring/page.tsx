"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Star, TrendingUp, TrendingDown, ToggleLeft, ToggleRight } from "lucide-react";

interface ScoringRule {
  id: string;
  name: string;
  object_type: string;
  field: string;
  operator: string;
  value: string | null;
  points: number;
  is_active: boolean;
}

const SCOREABLE_FIELDS = [
  { value: "status", label: "Estado del lead" },
  { value: "source", label: "Fuente del lead" },
  { value: "service_interest", label: "Servicio de interés" },
  { value: "phone", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "message", label: "Mensaje / descripción" },
  { value: "preferred_channel", label: "Canal preferido" },
  { value: "business_type", label: "Tipo de negocio" },
];

const OPERATORS = [
  { value: "equals", label: "es igual a" },
  { value: "not_equals", label: "no es igual a" },
  { value: "contains", label: "contiene" },
  { value: "is_set", label: "tiene valor" },
  { value: "is_not_set", label: "no tiene valor" },
];

const FIELD_PRESETS: Record<string, string[]> = {
  status: ["new", "contacted", "qualified", "scheduled", "won", "lost"],
  source: ["landing_form", "whatsapp", "referral", "email", "phone", "other"],
  preferred_channel: ["whatsapp", "email", "phone"],
  business_type: ["restaurante", "hotel", "hostal", "clinica", "farmacia", "tienda", "otro"],
};

const OPERATOR_HAS_VALUE = ["equals", "not_equals", "contains"];

const DEFAULT_RULES: Omit<ScoringRule, "id">[] = [
  { name: "Tiene teléfono", object_type: "lead", field: "phone", operator: "is_set", value: null, points: 5, is_active: true },
  { name: "Fuente: referido", object_type: "lead", field: "source", operator: "equals", value: "referral", points: 30, is_active: true },
  { name: "Fuente: landing", object_type: "lead", field: "source", operator: "equals", value: "landing_form", points: 10, is_active: true },
  { name: "Cualificado", object_type: "lead", field: "status", operator: "equals", value: "qualified", points: 25, is_active: true },
  { name: "Agendado", object_type: "lead", field: "status", operator: "equals", value: "scheduled", points: 40, is_active: true },
  { name: "Perdido", object_type: "lead", field: "status", operator: "equals", value: "lost", points: -20, is_active: true },
  { name: "Restaurante", object_type: "lead", field: "business_type", operator: "equals", value: "restaurante", points: 20, is_active: true },
  { name: "Hotel u hostal", object_type: "lead", field: "business_type", operator: "contains", value: "hotel", points: 20, is_active: true },
];

export default function ScoringPage() {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  const [form, setForm] = useState({
    name: "",
    field: "status",
    operator: "equals",
    value: "",
    points: 10,
    object_type: "lead",
  });

  useEffect(() => {
    fetch("/api/settings/scoring")
      .then(r => r.json())
      .then(data => { setRules(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm({ name: "", field: "status", operator: "equals", value: "", points: 10, object_type: "lead" });
  }

  async function createRule() {
    setSaving(true);
    const res = await fetch("/api/settings/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        value: OPERATOR_HAS_VALUE.includes(form.operator) ? form.value || null : null,
      }),
    });
    if (res.ok) {
      const newRule = await res.json();
      setRules(prev => [...prev, newRule]);
      setOpen(false);
      resetForm();
    }
    setSaving(false);
  }

  async function toggleActive(rule: ScoringRule) {
    const res = await fetch(`/api/settings/scoring/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("¿Eliminar esta regla?")) return;
    await fetch(`/api/settings/scoring/${id}`, { method: "DELETE" });
    setRules(prev => prev.filter(r => r.id !== id));
  }

  async function loadDefaultRules() {
    if (!confirm("¿Añadir reglas por defecto para sector hostelería/restauración?")) return;
    setLoadingDefaults(true);
    for (const rule of DEFAULT_RULES) {
      const res = await fetch("/api/settings/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (res.ok) {
        const created = await res.json();
        setRules(prev => [...prev, created]);
      }
    }
    setLoadingDefaults(false);
  }

  const totalPositive = rules.filter(r => r.is_active && r.points > 0).reduce((s, r) => s + r.points, 0);
  const totalNegative = rules.filter(r => r.is_active && r.points < 0).reduce((s, r) => s + r.points, 0);

  const needsValue = OPERATOR_HAS_VALUE.includes(form.operator);
  const presetValues = FIELD_PRESETS[form.field] ?? [];

  if (loading) return <PageSpinner containerClassName="py-8" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Scoring</h1>
          <p className="text-muted-foreground">Define reglas para puntuar automáticamente tus leads</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva regla
        </Button>
      </div>

      {/* Score summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Reglas activas</p>
                <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Máx. puntos positivos</p>
                <p className="text-2xl font-bold text-green-600">+{totalPositive}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Puntos negativos</p>
                <p className="text-2xl font-bold text-red-500">{totalNegative}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Reglas de puntuación</CardTitle>
            <CardDescription>Se aplican automáticamente al crear o actualizar un lead</CardDescription>
          </div>
          {rules.length === 0 && (
            <Button variant="outline" size="sm" onClick={loadDefaultRules} disabled={loadingDefaults}>
              {loadingDefaults ? <Spinner size="xs" tone="current" className="mr-1" /> : null}
              Cargar reglas predefinidas
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No hay reglas de scoring todavía</p>
              <p className="text-xs mt-1">Crea tu primera regla o carga las predefinidas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${
                    !rule.is_active ? "opacity-50 bg-muted/30" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {SCOREABLE_FIELDS.find(f => f.value === rule.field)?.label ?? rule.field}
                      {" "}
                      {OPERATORS.find(o => o.value === rule.operator)?.label ?? rule.operator}
                      {rule.value ? ` "${rule.value}"` : ""}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-sm font-bold min-w-[48px] justify-center ${
                      rule.points > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {rule.points > 0 ? "+" : ""}{rule.points}
                  </Badge>
                  <button
                    onClick={() => toggleActive(rule)}
                    className="text-muted-foreground hover:text-foreground"
                    title={rule.is_active ? "Desactivar" : "Activar"}
                  >
                    {rule.is_active
                      ? <ToggleRight className="h-5 w-5 text-green-500" />
                      : <ToggleLeft className="h-5 w-5" />
                    }
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create rule modal */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva regla de scoring</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre de la regla</Label>
              <Input
                placeholder="Ej: Lead cualificado"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Campo</Label>
              <Select
                value={form.field}
                onChange={e => setForm({ ...form, field: e.target.value, value: "" })}
              >
                {SCOREABLE_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condición</Label>
              <Select
                value={form.operator}
                onChange={e => setForm({ ...form, operator: e.target.value })}
              >
                {OPERATORS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            {needsValue && (
              <div className="space-y-1.5">
                <Label>Valor</Label>
                {presetValues.length > 0 ? (
                  <Select
                    value={form.value}
                    onChange={e => setForm({ ...form, value: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {presetValues.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    placeholder="Valor a comparar"
                    value={form.value}
                    onChange={e => setForm({ ...form, value: e.target.value })}
                  />
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Puntos ({form.points > 0 ? "positivos = suma" : "negativos = resta"})</Label>
              <Input
                type="number"
                value={form.points}
                onChange={e => setForm({ ...form, points: Number(e.target.value) })}
                placeholder="Ej: 20 o -10"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={createRule}
                disabled={saving || !form.name.trim() || !form.field}
              >
                {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
                Crear regla
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
