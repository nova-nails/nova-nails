// Prüft die Zeichenlimits aus pe.config.ts gegen das Layout: jedes Feld bis zum Limit füllen (lange deutsche Wörter),
// bei 390 und 1280 px darf nichts über den Rand ragen. Aufruf (Server läuft): node scripts/pe-limits.mjs [http://localhost:4335]
import { chromium } from 'playwright';

const BASIS = process.argv[2] ?? 'http://localhost:4335';
const WOERTER = ['Nagelverstärkung', 'Gelnägel', 'Auffüllen', 'Wohlfühl-Auszeit', 'und', 'Maniküre', 'mit', 'Liebe', 'Nidwalden', 'Modellage'];
let fehler = 0;
const browser = await chromium.launch();
for (const breite of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width: breite, height: 900 } });
  await page.goto(`${BASIS}/bearbeiten`);
  await page.locator('dialog').first().waitFor();
  const probleme = await page.evaluate((woerter) => {
    document.querySelectorAll('dialog').forEach((d) => d.close());
    const daten = JSON.parse(document.getElementById('pe-daten').textContent);
    // Was schon vorher überläuft (z. B. Deko-Herz im Kasten), zählt nicht
    const vorher = new Set([...document.querySelectorAll('body *')].filter((p) => p.scrollWidth > p.clientWidth + 1));
    for (const e of document.querySelectorAll('[data-pe]')) {
      const f = daten.felder[e.dataset.pe];
      if (!f || f.typ === 'bild') continue;
      if (f.typ === 'zahl') { e.textContent = String(f.max); continue; }
      let t = '';
      for (let i = 0; t.length < f.max; i++) t += (t ? ' ' : '') + woerter[i % woerter.length];
      e.textContent = t.slice(0, f.max).trim();
    }
    const raus = [];
    const b = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > b + 1) raus.push(`Seite ${document.documentElement.scrollWidth}px breit`);
    for (const e of document.querySelectorAll('[data-pe]')) {
      const r = e.getBoundingClientRect();
      if (r.right > b + 1 || r.left < -1) raus.push(`${e.dataset.pe} ragt hinaus (${Math.round(r.left)}–${Math.round(r.right)})`);
      const karte = e.closest('.card, aside, [class*="rounded-"]');
      if (karte) { const k = karte.getBoundingClientRect(); if (r.right > k.right + 1) raus.push(`${e.dataset.pe} ragt aus dem Kasten`); }
      // Eltern mit fester Breite (Karten, Preiszeile) dürfen nicht überlaufen
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        if (!vorher.has(p) && p.scrollWidth > p.clientWidth + 1 && getComputedStyle(p).overflowX !== 'visible') { raus.push(`${e.dataset.pe}: ${p.tagName.toLowerCase()}.${[...p.classList].slice(0, 2).join('.')} läuft über`); break; }
      }
    }
    return [...new Set(raus)];
  }, WOERTER);
  await page.screenshot({ path: `${process.env.TMPDIR ?? '/tmp'}/pe-limits-${breite}.png`, fullPage: true });
  console.log(`${breite}px: ${probleme.length ? `✗\n  - ${probleme.join('\n  - ')}` : '✓ nichts ragt hinaus'}`);
  fehler += probleme.length;
  await page.close();
}
await browser.close();
process.exit(fehler ? 1 : 0);
