// Foto im Browser vorbereiten: laden (EXIF-Drehung macht der Browser), Ausschnitt wählen, verkleinern, komprimieren.
import { T } from '../core/texte.ts';
import { dialog, el } from './ui.ts';

export const ZIEL_BYTES = 950_000;

export function ladeBild(datei: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(datei);
    const img = new Image();
    img.onload = () => (img.naturalWidth && img.naturalHeight ? res(img) : rej(new Error('leer')));
    img.onerror = () => rej(new Error('format'));
    img.src = url;
  });
}

const toBlob = (c: HTMLCanvasElement, typ: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, typ, q));

/** Ausschnitt in Quell-Pixeln → WebP (sonst JPEG) unter ZIEL_BYTES, längste Seite ≤ maxPx. */
export async function exportiere(img: HTMLImageElement, aus: { x: number; y: number; b: number; h: number }, maxPx: number): Promise<Blob> {
  let faktor = Math.min(1, maxPx / Math.max(aus.b, aus.h));
  for (let runde = 0; runde < 5; runde++) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(aus.b * faktor));
    c.height = Math.max(1, Math.round(aus.h * faktor));
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, aus.x, aus.y, aus.b, aus.h, 0, 0, c.width, c.height);
    for (const q of [0.86, 0.78, 0.68, 0.58]) {
      let b = await toBlob(c, 'image/webp', q);
      if (!b || b.type !== 'image/webp') b = await toBlob(c, 'image/jpeg', q);
      if (b && b.size <= ZIEL_BYTES) return b;
    }
    faktor *= 0.8;
  }
  throw new Error('zu_gross');
}

/** Dialog: Foto im Rahmen verschieben und zoomen. Liefert den Ausschnitt in Quell-Pixeln (null = abgebrochen). */
export function zuschneiden(img: HTMLImageElement, verhaeltnis: number): Promise<{ x: number; y: number; b: number; h: number } | null> {
  return new Promise((res) => {
    const dl = dialog({ label: T.fotoZuschneiden, klasse: 'pe-zuschnitt' });
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const maxB = Math.min(520, window.innerWidth - 64);
    const maxH = Math.max(200, window.innerHeight * 0.52);
    const rb = Math.round(Math.min(maxB, maxH * verhaeltnis));
    const rh = Math.round(rb / verhaeltnis);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = el('canvas', { width: rb * dpr, height: rh * dpr, 'aria-hidden': 'true' });
    const rahmen = el('div', { class: 'pe-rahmen', tabindex: '0', role: 'application', 'aria-label': `${T.fotoZuschneiden}. ${T.fotoZuschneidenHilfe}`, style: `width:${rb}px;height:${rh}px` }, canvas);
    const ctx = canvas.getContext('2d')!;
    const basis = Math.max(rb / iw, rh / ih); // füllt den Rahmen
    let zoom = 1, ox = (rb - iw * basis) / 2, oy = (rh - ih * basis) / 2;

    const begrenze = () => {
      const s = basis * zoom;
      ox = Math.min(0, Math.max(rb - iw * s, ox));
      oy = Math.min(0, Math.max(rh - ih * s, oy));
    };
    const zeichne = () => {
      begrenze();
      const s = basis * zoom;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rb, rh);
      ctx.drawImage(img, ox, oy, iw * s, ih * s);
    };
    const zoomeAuf = (z: number, mx = rb / 2, my = rh / 2) => {
      const alt = basis * zoom;
      zoom = Math.min(4, Math.max(1, z));
      const neu = basis * zoom;
      ox = mx - ((mx - ox) / alt) * neu;
      oy = my - ((my - oy) / alt) * neu;
      regler.value = String(zoom);
      zeichne();
    };

    let ziehen: { x: number; y: number } | null = null;
    rahmen.addEventListener('pointerdown', (e) => { ziehen = { x: e.clientX, y: e.clientY }; rahmen.setPointerCapture(e.pointerId); });
    rahmen.addEventListener('pointermove', (e) => {
      if (!ziehen) return;
      ox += e.clientX - ziehen.x; oy += e.clientY - ziehen.y;
      ziehen = { x: e.clientX, y: e.clientY };
      zeichne();
    });
    const loslassen = () => { ziehen = null; };
    rahmen.addEventListener('pointerup', loslassen);
    rahmen.addEventListener('pointercancel', loslassen);
    rahmen.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = rahmen.getBoundingClientRect();
      zoomeAuf(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    rahmen.addEventListener('keydown', (e) => {
      const schritt = e.shiftKey ? 40 : 12;
      const d = ({ ArrowLeft: [schritt, 0], ArrowRight: [-schritt, 0], ArrowUp: [0, schritt], ArrowDown: [0, -schritt] } as Record<string, number[]>)[e.key];
      if (!d) return;
      e.preventDefault();
      ox += d[0]; oy += d[1];
      zeichne();
    });

    const regler = el('input', { type: 'range', min: '1', max: '4', step: '0.01', value: '1', 'aria-label': T.fotoZoom, oninput: () => zoomeAuf(Number(regler.value)) });
    let ergebnis: { x: number; y: number; b: number; h: number } | null = null;
    dl.inhalt.append(
      el('h2', {}, T.fotoZuschneiden),
      el('p', { class: 'pe-sanft' }, T.fotoZuschneidenHilfe),
      rahmen,
      el('label', { class: 'pe-zoom' }, T.fotoZoom, regler),
      el('div', { class: 'pe-dialog-knoepfe' },
        el('button', { type: 'button', class: 'pe-knopf pe-rand', onclick: () => dl.schliessen() }, T.abbrechen),
        el('button', { type: 'button', class: 'pe-knopf pe-haupt', onclick: () => {
          const s = basis * zoom;
          ergebnis = { x: -ox / s, y: -oy / s, b: rb / s, h: rh / s };
          dl.schliessen();
        } }, T.fotoUebernehmen)),
    );
    dl.d.addEventListener('close', () => res(ergebnis));
    zeichne();
    rahmen.focus();
  });
}

export const blobZuDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});
