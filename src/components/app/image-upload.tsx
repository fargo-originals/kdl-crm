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
  const [preview, setPreview] = useState(''); // local blob URL while uploading
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    setError('');
    // Show local preview immediately (no wait for network)
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Error al subir la imagen');
      setPreview('');
    } else {
      onChange(json.url);
      setPreview(''); // storage URL is now in `value` prop
    }
    setUploading(false);
    URL.revokeObjectURL(localUrl);
  }

  function handleFiles(files: FileList | null) {
    if (files?.[0]) upload(files[0]);
  }

  // Show local preview while uploading, otherwise use saved URL
  const displayUrl = preview || value;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <p className="text-sm font-medium leading-none">{label}</p>}

      {/* Preview */}
      {displayUrl && (
        <div className="relative inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt=""
            className="h-28 w-auto max-w-full rounded-md border object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40">
              <Upload className="h-5 w-5 animate-bounce text-white" />
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={() => { onChange(''); setPreview(''); }}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white shadow hover:opacity-80"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Drop zone (only shown when no image) */}
      {!displayUrl && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-4 text-sm text-muted-foreground transition-colors
            ${drag ? 'border-primary bg-primary/5' : 'border-input hover:border-primary hover:bg-accent/30'}
            ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <ImageIcon className="h-6 w-6" />
          <span>Arrastra o <span className="text-primary underline">selecciona</span> una imagen</span>
          <span className="text-xs opacity-70">JPG, PNG, WebP, GIF, SVG · máx. 5 MB</span>
        </div>
      )}

      {/* Replace button when image exists */}
      {displayUrl && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Cambiar imagen
        </button>
      )}

      {/* URL manual fallback */}
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setPreview(''); }}
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
