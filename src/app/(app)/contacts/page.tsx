"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Mail, Phone, Building2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  company_id: string;
  lifecycle_stage: string;
  created_at: string;
  company?: { name: string };
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  lead: "secondary",
  opportunity: "warning",
  customer: "success",
  inactive: "default",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*, company:companies(name)")
      .order("created_at", { ascending: false });

    if (data) setContacts(data);
    setLoading(false);
  }

  const filteredContacts = contacts.filter(
    (c) =>
      c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contactos</h1>
          <p className="text-muted-foreground">Gestiona tus contactos y leads</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo contacto
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar contactos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contactos ({filteredContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay contactos todavía</p>
              <Button onClick={loadContacts}>Recargar</Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between py-4 hover:bg-accent/50 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {contact.first_name?.[0]}
                      {contact.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {contact.company?.name || "Sin empresa"} · {contact.job_title || ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={statusColors[contact.lifecycle_stage] || "default"}>
                      {contact.lifecycle_stage}
                    </Badge>
                    <div className="flex gap-2 text-muted-foreground">
                      <Button variant="ghost" size="icon">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}