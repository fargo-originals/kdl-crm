"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Check, ExternalLink, CalendarDays } from "lucide-react";

interface SessionUser {
  sub: string;
  email: string;
  role: string;
}

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => { if (!data.error) setUser(data); });

    fetch("/api/settings/availability")
      .then(r => r.json())
      .then(data => { if (data.booking_slug) setBookingSlug(data.booking_slug); })
      .catch(() => {});
  }, []);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const bookingUrl = bookingSlug ? `${appUrl}/book/${bookingSlug}` : null;

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del perfil</CardTitle>
          <CardDescription>Tu información de cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div>
            <label className="text-sm font-medium">Rol</label>
            <Input value={user?.role || ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Tu página de reservas
          </CardTitle>
          <CardDescription>
            Comparte este link con tus prospectos para que reserven reunión contigo sin ir y venir con emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookingUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input value={bookingUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  title="Copiar link"
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir en nueva pestaña"
                >
                  <Button variant="outline" size="icon" className="shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Puedes cambiar la disponibilidad y la duración de las reuniones en{" "}
                <a href="/settings/availability" className="text-primary hover:underline">
                  Settings → Disponibilidad
                </a>.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              <CalendarDays className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p>No tienes página de reservas configurada todavía.</p>
              <a href="/settings/availability" className="text-primary hover:underline text-xs mt-1 inline-block">
                Ir a Disponibilidad para activarla →
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
