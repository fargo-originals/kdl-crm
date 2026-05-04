'use client';

import { useRef, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label, className = '' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Error al subir');
    } else {
      onChange(json.url);
    }
    setUploading(false);
  }

  function handleFiles(files: FileList | null) {
    if (files?.[0]) upload(files[0]);
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <p className="text-sm font-medium">{label}</p>}

      {/* Preview + clear */}
      {value && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-24 w-auto rounded-md border object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white hover:opacity-80"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors
          ${drag ? 'border-primary bg-primary/5' : 'border-input hover:border-primary hover:bg-accent/30'}
          ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {uploading ? (
          <span className="flex items-center gap-2"><Upload className="h-4 w-4 animate-bounce" />Subiendo...</span>
        ) : (
          <>
            <ImageIcon className="h-5 w-5" />
            <span>Arrastra una imagen o <span className="text-primary underline">selecciona</span></span>
            <span className="text-xs">JPG, PNG, WebP, GIF, SVG · máx. 5 MB</span>
          </>
        )}
      </div>

      {/* URL manual fallback */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="O pega una URL de imagen..."
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}
