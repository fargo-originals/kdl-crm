// Generates minimal PWA icons using Sharp (already in project deps via Next.js)
// Run: node scripts/generate-icons.mjs
import { createCanvas } from 'node:canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  // We'll create a simple SVG-based approach
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#2563eb"/>
  <text x="${size/2}" y="${size/2 + size*0.12}" font-family="system-ui,sans-serif" font-size="${size*0.45}" font-weight="bold" fill="white" text-anchor="middle">K</text>
</svg>`;
  return svg;
}

const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.svg`), drawIcon(size));
  console.log(`Generated icon-${size}.svg`);
}

console.log('Icons generated. Convert SVG to PNG if needed.');
