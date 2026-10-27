// Porträt aus content/ueber.json (Datei in src/assets/julia). Fehlt sie, bricht der Build ab.
import type { ImageMetadata } from 'astro';
import ueber from '../../content/ueber.json';

const dateien = import.meta.glob<{ default: ImageMetadata }>('../assets/julia/*.{jpg,jpeg,png,webp,avif}', { eager: true });
const mod = dateien[`../assets/julia/${ueber.bild}`];
if (!mod) throw new Error(`content/ueber.json: Datei src/assets/julia/${ueber.bild} nicht gefunden.`);
export const portrait = mod.default;
