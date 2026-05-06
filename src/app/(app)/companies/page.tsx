"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Plus, Search, Globe, MapPin, Users, Loader2, Phone, ExternalLink } from "lucide-react";
import { FaInstagram, FaFacebook, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  created_at: string;
}

function waHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("34") ? digits : (digits.startsWith("6") || digits.startsWith("7")) ? `34${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

function ensureHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}

function instagramUrl(val: string | null): string | null {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  return `https://instagram.com/${val.replace(/^@/, "")}`;
}

const industries = ["Tecnología", "Salud", "Educación", "Finanzas", "Retail", "Manufactura", "Consultoría", "Marketing", "Legal", "Otro"];
const sizes = [
  { value: "1-10", label: "1-10 empleados" },
  { value: "11-50", label: "11-50 empleados" },
  { value: "50-200", label: "50-200 empleados" },
  { value: "200+", label: "200+ empleados" },
];
const emptyForm = { name: "", domain: "", industry: "", size: "", city: "", country: "", phone: "", website: "" };

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    setLoading(true);
    const res = await fetch("/api/companies");
    const data = await res.json();
    setCompanies(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, domain: form.domain || null, industry: form.industry || null, size: form.size || null, city: form.city || null, country: form.country || null, phone: form.phone || null, website: form.website || null }),
    });
    if (res.ok) { setOpen(false); setForm(emptyForm); await loadCompanies(); }
    setSaving(false);
  }

  const filtered = companies.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gestiona tus cuentas empresariales</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva empresa</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar empresas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No hay empresas todavía</p>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Crear primera empresa</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((company) => {
            const wa = waHref(company.phone);
            const ig = instagramUrl(company.instagram);
            const fb = ensureHttps(company.facebook);
            const li = ensureHttps(company.linkedin);
            const web = ensureHttps(company.website);
            return (
              <div
                key={company.id}
                className="relative flex flex-col rounded-lg border bg-card text-sm transition-colors hover:shadow-md cursor-pointer"
                onClick={() => router.push(`/companies/${company.id}`)}
              >
                {/* Thumbnail / initial */}
                <div className="h-20 w-full overflow-hidden rounded-t-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-muted-foreground/30 select-none">
                    {company.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-1.5 p-2.5 pt-2">
                  <p className="font-semibold leading-snug line-clamp-2" title={company.name}>{company.name}</p>

                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    {company.industry && <span className="truncate max-w-full">{company.industry}</span>}
                    {company.size && <span className="shrink-0 flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{company.size}</span>}
                  </div>

                  {(company.city || company.country) && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />{[company.city, company.country].filter(Boolean).join(", ")}
                    </p>
                  )}

                  <div className="space-y-1">
                    {company.phone && (
                      <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 text-[11px] hover:text-primary truncate"
                        onClick={e => e.stopPropagation()}>
                        <Phone className="h-3 w-3 shrink-0" />{company.phone}
                      </a>
                    )}
                    {web && (
                      <a href={web} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] hover:text-primary truncate"
                        onClick={e => e.stopPropagation()}>
                        <Globe className="h-3 w-3 shrink-0" />{company.domain ?? company.website}
                        <ExternalLink className="h-2 w-2 opacity-60 shrink-0" />
                      </a>
                    )}
                  </div>

                  {/* Social icons row */}
                  {(wa || ig || fb || li) && (
                    <div className="flex items-center gap-2 mt-auto pt-1">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700" title="WhatsApp"
                          onClick={e => e.stopPropagation()}>
                          <FaWhatsapp className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {ig && (
                        <a href={ig} target="_blank" rel="noopener noreferrer"
                          className="text-pink-600 hover:text-pink-700" title="Instagram"
                          onClick={e => e.stopPropagation()}>
                          <FaInstagram className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {fb && (
                        <a href={fb} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700" title="Facebook"
                          onClick={e => e.stopPropagation()}>
                          <FaFacebook className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {li && (
                        <a href={li} target="_blank" rel="noopener noreferrer"
                          className="text-sky-600 hover:text-sky-700" title="LinkedIn"
                          onClick={e => e.stopPropagation()}>
                          <FaLinkedin className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva empresa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" placeholder="Nombre de la empresa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="domain">Dominio</Label>
                <Input id="domain" placeholder="empresa.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="industry">Industria</Label>
                <Select id="industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="size">Tamaño</Label>
                <Select id="size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {sizes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" placeholder="Madrid" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="country">País</Label>
                <Input id="country" placeholder="España" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Crear empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
