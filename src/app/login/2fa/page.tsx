'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Globe } from 'lucide-react';

function TwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');

  useEffect(() => {
    const token = searchParams.get('token') ?? sessionStorage.getItem('2fa_temp_token') ?? '';
    setTempToken(token);
    if (!token) router.replace('/login');
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tempToken) { router.replace('/login'); return; }
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: tempToken, code }),
    });

    if (res.ok) {
      sessionStorage.removeItem('2fa_temp_token');
      router.push('/dashboard');
    } else {
      const data = await res.json();
      setError(data.error ?? 'Código incorrecto');
      setCode('');
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verificación en 2 pasos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Introduce el código de 6 dígitos de tu aplicación de autenticación
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9A-Za-z\-]{4,9}"
              maxLength={9}
              autoFocus
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder="000000"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1.5 text-xs text-muted-foreground text-center">
              También puedes usar uno de tus códigos de recuperación
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver al inicio de sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Globe className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TwoFactorForm />
    </Suspense>
  );
}
