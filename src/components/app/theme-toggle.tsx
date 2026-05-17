'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const MODES = [
  { value: 'light',  icon: Sun,     label: 'Claro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
  { value: 'dark',   icon: Moon,    label: 'Oscuro' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
      {MODES.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={`flex flex-1 items-center justify-center gap-1 rounded px-1.5 py-1 text-xs font-medium transition-colors ${
            theme === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
