"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getMadridZoneOptions } from "@/lib/prospecting/madrid-zones";
import { SECTORS } from "@/lib/prospecting/sectors";

export function SearchForm() {
  const router = useRouter();
  const zones = useMemo(() => getMadridZoneOptions(), []);
  const [sector, setSector] = useState<string>(SECTORS[0].id);
  const [zone, setZone] = useState(zones[0]?.value ?? "Madrid");
  const [zoneType, setZoneType] = useState<"barrio" | "distrito" | "ciudad">(zones[0]?.type ?? "ciudad");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/prospecting/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sector, zone, zoneType }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo iniciar la busqueda");
      return;
    }

    router.push(payload.data.redirectTo);
  }

  function handleZoneChange(value: string) {
    const selected = zones.find((item) => item.value === value);
    setZone(value);
    setZoneType(selected?.type ?? "ciudad");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva busqueda</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="sector">Sector</Label>
            <Select id="sector" value={sector} onChange={(event) => setSector(event.target.value)}>
              {SECTORS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone">Zona</Label>
            <Select id="zone" value={zone} onChange={(event) => handleZoneChange(event.target.value)}>
              <option value="Madrid">Madrid ciudad</option>
              {zones.map((item) => (
                <option key={`${item.type}-${item.value}`} value={item.value}>
                  {item.label} ({item.type})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar
            </Button>
          </div>
          {error && <p className="md:col-span-3 text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
