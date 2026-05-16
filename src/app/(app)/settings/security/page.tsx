'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ShieldCheck, ShieldOff, Copy, Check, AlertTriangle } from 'lucide-react';

type Step = 'idle' | 'setup' | 'confirm' | 'recovery' | 'disable';

export default function SecuritySettingsPage() {
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  async function loadStatus() {
    const res = await fetch('/api/auth/2fa/status');
    if (res.ok) {
      const data = await res.json();
      setTotpEnabled(data.totp_enabled ?? false);
    }
  }

  useEffect(() => { loadStatus(); }, []);

  async function startSetup() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Error'); return; }
    setQrUrl(data.qr_url);
    setSecret(data.secret);
    setStep('setup');
  }

  async function confirmEnable() {
    if (!code) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Error'); return; }
    setRecoveryCodes(data.recovery_codes ?? []);
    setTotpEnabled(true);
    setStep('recovery');
    setCode('');
  }

  async function confirmDisable() {
    if (!code) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Error'); return; }
    setTotpEnabled(false);
    setStep('idle');
    setCode('');
  }

  function copyRecoveryCodes() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function cancel() {
    setStep('idle');
    setCode('');
    setError('');
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-3xl font-bold">Seguridad</h1>
        <p className="text-muted-foreground">Configuración de seguridad de tu cuenta</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {totpEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-base">Verificación en dos pasos (2FA)</CardTitle>
                <CardDescription>
                  Protege tu cuenta con un código extra al iniciar sesión
                </CardDescription>
              </div>
            </div>
            {totpEnabled !== null && (
              <Badge variant={totpEnabled ? 'success' : 'secondary'}>
                {totpEnabled ? 'Activado' : 'Desactivado'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* idle — disabled */}
          {step === 'idle' && totpEnabled === false && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Usa Google Authenticator, Authy u otra app compatible con TOTP para generar códigos temporales cada 30 segundos.
              </p>
              <Button onClick={startSetup} disabled={loading}>
                {loading ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
                Activar verificación en 2 pasos
              </Button>
            </div>
          )}

          {/* idle — enabled */}
          {step === 'idle' && totpEnabled === true && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tu cuenta está protegida. Necesitarás tu app de autenticación cada vez que inicies sesión.
              </p>
              <Button variant="destructive" onClick={() => setStep('disable')}>
                Desactivar 2FA
              </Button>
            </div>
          )}

          {/* setup: QR code */}
          {step === 'setup' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>Paso 1:</strong> Escanea este código QR con tu app de autenticación (Google Authenticator, Authy, etc.):
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR Code 2FA" className="rounded-lg border w-48 h-48" width={192} height={192} />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">O introduce la clave manualmente en tu app:</p>
                <code className="block rounded bg-muted px-3 py-2 text-xs font-mono break-all select-all">{secret}</code>
              </div>
              <div className="space-y-1.5">
                <Label><strong>Paso 2:</strong> Introduce el código de 6 dígitos que aparece en tu app:</Label>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="font-mono tracking-widest text-center text-lg w-36"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <Button onClick={confirmEnable} disabled={loading || code.length !== 6}>
                    {loading ? <Spinner size="sm" tone="current" /> : 'Confirmar y activar'}
                  </Button>
                  <Button variant="outline" onClick={cancel}>Cancelar</Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          {/* recovery codes */}
          {step === 'recovery' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>¡Importante!</strong> Guarda estos códigos de recuperación en un lugar seguro. Solo se muestran una vez y te permiten acceder si pierdes tu dispositivo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map(c => (
                  <code key={c} className="rounded bg-muted px-3 py-1.5 text-xs font-mono text-center tracking-wider">{c}</code>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={copyRecoveryCodes}>
                  {copied
                    ? <><Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />Copiados</>
                    : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copiar todos</>
                  }
                </Button>
                <Button size="sm" onClick={() => setStep('idle')}>
                  He guardado mis códigos →
                </Button>
              </div>
            </div>
          )}

          {/* disable */}
          {step === 'disable' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Introduce el código de tu app de autenticación (o un código de recuperación) para confirmar:
              </p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\s/g, ''))}
                  placeholder="000000 o XXXX-XXXX"
                  maxLength={9}
                  className="font-mono tracking-widest text-center w-44"
                  inputMode="numeric"
                />
                <Button variant="destructive" onClick={confirmDisable} disabled={loading || code.length < 6}>
                  {loading ? <Spinner size="sm" tone="current" /> : 'Desactivar'}
                </Button>
                <Button variant="outline" onClick={cancel}>Cancelar</Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          {totpEnabled === null && (
            <div className="flex justify-center py-4"><Spinner /></div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
