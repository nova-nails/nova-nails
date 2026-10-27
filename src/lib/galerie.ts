// Galerie: nur freigegebene Fotos, Alt-Text Pflicht. Fehler brechen den Build ab.
import type { ImageMetadata } from 'astro';
import galerie from '../../content/galerie.json';

type Foto = { datei: string; alt: string; freigegeben: boolean };
const dateien = import.meta.glob<{ default: ImageMetadata }>('../assets/galerie/*.{jpg,jpeg,png,webp,avif}', { eager: true });

export const fotos = (galerie.fotos as Foto[])
  .map((f, index) => ({ ...f, index }))
  .filter((f) => f.freigegeben === true)
  .map((f) => {
    if (!f.alt || !f.alt.trim()) throw new Error(`content/galerie.json: Alt-Text fehlt für «${f.datei}».`);
    const mod = dateien[`../assets/galerie/${f.datei}`];
    if (!mod) throw new Error(`content/galerie.json: Datei src/assets/galerie/${f.datei} nicht gefunden.`);
    return { src: mod.default, alt: f.alt.trim(), index: f.index };
  });
