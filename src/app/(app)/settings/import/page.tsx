"use client";

import { useState, useRef } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, File, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ParsedContact {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
}

export default function ImportDataPage() {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFromText = (text: string): ParsedContact[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const contacts: ParsedContact[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
      if (values.length < 2) continue;
      const contact: ParsedContact = {
        first_name: values[headers.indexOf("first_name")] || values[headers.indexOf("nombre")] || "",
        last_name: values[headers.indexOf("last_name")] || values[headers.indexOf("apellido")] || "",
        email: values[headers.indexOf("email")] || values[headers.indexOf("correo")] || "",
      };
      if (contact.first_name || contact.last_name || contact.email) {
        contact.phone = values[headers.indexOf("phone")] || values[headers.indexOf("teléfono")] || values[headers.indexOf("telefono")] || "";
        contact.company = values[headers.indexOf("company")] || values[headers.indexOf("empresa")] || "";
        contact.job_title = values[headers.indexOf("job_title")] || values[headers.indexOf("cargo")] || "";
        contacts.push(contact);
      }
    }
    return contacts;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setParsedData([]);
    // Auto-process
    setLoading(true);
    try {
      const text = await f.text();
      const contacts = parseFromText(text);
      setParsedData(contacts);
    } catch (err) {
      console.error(err);
      alert("Error al procesar el archivo");
      setParsedData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const contact of parsedData) {
      if (!contact.email && !contact.first_name) { failed++; continue; }
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email || null,
          phone: contact.phone || null,
          job_title: contact.job_title || null,
          lifecycle_stage: "lead",
        }),
      });
      if (!res.ok) { failed++; } else { success++; }
    }
    setResult({ success, failed });
    setImporting(false);
    setParsedData([]);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAll = () => {
    setFile(null);
    setParsedData([]);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar Datos</h1>
          <p className="text-muted-foreground">Importa contactos desde CSV/Excel</p>
        </div>
        <UserButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir archivo
          </CardTitle>
          <CardDescription>
            Sube un archivo CSV con tus contactos. Debe tener las columnas: nombre, apellido, email, teléfono, empresa, cargo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 px-6 py-8 transition-colors hover:border-muted-foreground/50">
              <File className="h-8 w-8 text-muted-foreground" />
              <span className="mt-2 text-sm text-muted-foreground">Haz clic para seleccionar un archivo CSV</span>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          ) : loading ? (
            <div className="flex h-20 items-center justify-center text-muted-foreground">Procesando archivo...</div>
          ) : (
            <div className="flex items-center justify-between rounded-md border p-4">
              <div className="flex items-center gap-3">
                <File className="h-6 w-6 text-muted-foreground" />
                <div>
                  <span className="font-medium">{file.name}</span>
                  {parsedData.length > 0 && <p className="text-sm text-muted-foreground">{parsedData.length} contactos listos para importar</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {parsedData.length > 0 && (
                  <Button size="sm" onClick={handleImport} disabled={importing}>
                    {importing ? "Importando..." : `Importar ${parsedData.length}`}
                  </Button>
                )}
                <button className="text-sm text-muted-foreground hover:text-foreground" onClick={clearAll}>Quitar</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Previsualización ({parsedData.length} contactos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left p-2">Nombre</th>
                    <th className="text-left p-2">Apellido</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Teléfono</th>
                    <th className="text-left p-2">Empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((contact, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{contact.first_name}</td>
                      <td className="p-2">{contact.last_name}</td>
                      <td className="p-2">{contact.email}</td>
                      <td className="p-2">{contact.phone}</td>
                      <td className="p-2">{contact.company}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando..." : `Importar ${parsedData.length} contactos`}
              </Button>
              <Button variant="outline" onClick={clearAll}> Cancelar </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              {result.failed === 0 ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">Importación completada</p>
                <p className="text-sm text-muted-foreground">{result.success} contactos importados, {result.failed} fallidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
