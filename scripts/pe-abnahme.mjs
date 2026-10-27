// Abnahme Bearbeiten-Modus am Handy (390 px) gegen den lokalen Server (npm run pe:dev):
// Text, Preis, Foto ändern und veröffentlichen (< 2 Min.), danach jeder Fehlerfall einmal. Screenshots: docs/screenshots/pe-*.png
// Aufruf: node scripts/pe-abnahme.mjs [http://localhost:4335]
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASIS = process.argv[2] ?? 'http://localhost:4335';
const zugang = JSON.parse(readFileSync('peter-und-co-editor/dev/test-zugang.json', 'utf8'));
const SHOTS = 'docs/screenshots';
const TMP = join(process.env.TMPDIR ?? '/tmp', 'pe-abnahme');
mkdirSync(TMP, { recursive: true });
let ok = 0, fehler = 0;
const pruefe = (name, bed, info = '') => {
  if (bed) { ok++; console.log(`  ✓ ${name}`); } else { fehler++; console.log(`  ✗ ${name} ${info}`); }
};
const datei = async (pfad) => (await fetch(`${BASIS}/_dev/datei?pfad=${encodeURIComponent(pfad)}`)).text();
const json = async (pfad) => JSON.parse(await datei(pfad));
const fremd = async (pfad, text) => (await fetch(`${BASIS}/_dev/fremd`, { method: 'POST', body: JSON.stringify({ datei: pfad, text }) })).json();
const ser = (o) => `${JSON.stringify(o, null, 2)}\n`;
const warteBisOnline = async (commit) => {
  for (let i = 0; i < 120; i++) {
    if ((await (await fetch(`${BASIS}/pe-version.json`)).json()).commit === commit) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Deploy hängt');
};

// Testfoto: 3000×2000 gespeichert, EXIF «drehen» (6) → Handy-Hochformat. Gespeichert oben rosa, unten violett → angezeigt links violett, rechts rosa.
const testfoto = join(TMP, 'handy-foto.jpg');
await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#efb3c4' } })
  .composite([{ input: { create: { width: 3000, height: 1000, channels: 3, background: '#7a3d8f' } }, top: 1000, left: 0 }])
  .jpeg({ quality: 92 }).withMetadata({ orientation: 6 }).toFile(testfoto);
const kaputt = join(TMP, 'kein-foto.jpg');
await import('node:fs').then((fs) => fs.writeFileSync(kaputt, 'Das ist kein Foto'));

const browser = await chromium.launch();
const handy = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-CH' };
const ctx = await browser.newContext(handy);
const page = await ctx.newPage();
page.on('pageerror', (e) => { fehler++; console.log('  ✗ JS-Fehler', e.message); });
const bild = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const feld = (pfad) => page.locator(`[data-pe="${pfad}"]`);
const leiste = page.locator('.pe-status');
async function ersetzeText(pfad, text) {
  const f = feld(pfad);
  await f.scrollIntoViewIfNeeded();
  await f.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(text);
}
async function anmelden(p = page) {
  await p.getByLabel('E-Mail').fill(zugang.email);
  await p.getByLabel('Passwort').fill(zugang.passwort);
  await p.getByRole('button', { name: 'Anmelden' }).click();
}
const veroeffentlichenUndWarten = async () => {
  await page.getByRole('button', { name: 'Veröffentlichen' }).click();
  await page.getByText('Fertig, deine Änderungen sind online!').waitFor({ timeout: 120_000 });
};

console.log('Abnahme: Text, Preis, Foto am Handy');
const start = Date.now();
await page.goto(`${BASIS}/bearbeiten`);
await page.getByLabel('E-Mail').waitFor();
await bild('pe-1-anmelden');
await anmelden();
await page.getByRole('button', { name: 'Alles klar' }).waitFor();
await bild('pe-2-hinweis');
await page.getByRole('button', { name: 'Alles klar' }).click();

await ersetzeText('site.json#hero.titel', 'Deine Auszeit für schöne Hände');
await bild('pe-3-text');
await ersetzeText('preise.json#leistungen.3.preisVon', '4x5');
pruefe('Buchstabe im Preis wird abgelehnt, freundlicher Hinweis', (await page.locator('.pe-pop-hinweis').textContent()).includes('Bitte nur eine Zahl'));
pruefe('Preis zeigt 45', (await feld('preise.json#leistungen.3.preisVon').textContent()) === '45');
await bild('pe-4-preis');

const portraet = feld('ueber.json#bild');
await portraet.scrollIntoViewIfNeeded();
await portraet.click();
const [wahl] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Foto ersetzen' }).click()]);
await wahl.setFiles(testfoto);
const rahmen = page.locator('.pe-rahmen');
await rahmen.waitFor();
const r = await rahmen.boundingBox();
await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
await page.mouse.down();
await page.mouse.move(r.x + r.width / 2 + 30, r.y + r.height / 2, { steps: 5 });
await page.mouse.up();
await bild('pe-5-foto');
await page.getByRole('button', { name: 'Foto übernehmen' }).click();
await page.waitForFunction(() => document.querySelector('[data-pe="ueber.json#bild"]').src.startsWith('data:image/'));
pruefe('Leiste zeigt 3 Änderungen', (await leiste.textContent()) === '3 Änderungen');
await bild('pe-6-leiste');
await veroeffentlichenUndWarten();
const dauer = (Date.now() - start) / 1000;
await bild('pe-7-online');
pruefe(`Ablauf unter 2 Minuten (${dauer.toFixed(0)} s inkl. Bau)`, dauer < 120);

const site = await json('content/site.json');
const preise = await json('content/preise.json');
const ueber = await json('content/ueber.json');
pruefe('Text gespeichert', site.hero.titel === 'Deine Auszeit für schöne Hände');
pruefe('Preis gespeichert (Zahl)', preise.leistungen[3].preisVon === 45);
pruefe('Foto: neuer Dateiname, altes gelöscht', /^julia-tellenbach-\d{8}-\d{6}\.webp$/.test(ueber.bild) && (await datei('src/assets/julia/julia-tellenbach.png')) === '');
const fotoPfad = join('.pe-dev/repo/src/assets/julia', ueber.bild);
const meta = await sharp(fotoPfad).metadata();
const { size } = await import('node:fs').then((fs) => fs.statSync(fotoPfad));
pruefe(`Foto ≤ 1200 px, < 1 MB, Seitenverhältnis 444:495 (${meta.width}×${meta.height}, ${(size / 1024).toFixed(0)} KB)`, Math.max(meta.width, meta.height) <= 1200 && size < 1_000_000 && Math.abs(meta.width / meta.height / (444 / 495) - 1) < 0.02);
const px = async (x, y) => { const { data } = await sharp(fotoPfad).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true }); return data; };
const links = await px(5, Math.floor(meta.height / 2)), rechts = await px(meta.width - 5, Math.floor(meta.height / 2));
pruefe('Foto richtig gedreht (EXIF): links violett, rechts rosa', links[0] < 160 && rechts[0] > 200, `${[...links]} / ${[...rechts]}`);
const log = await (await fetch(`${BASIS}/_dev/log`)).text();
pruefe('ein Commit, lesbare Nachricht', /Julia: Hero-Titel, Preis \(Maniküre\), Porträt/.test(log.split('\n')[0]), log.split('\n')[0]);
const oeffentlich = await (await fetch(`${BASIS}/`)).text();
pruefe('öffentliche Seite zeigt Änderungen, ohne data-pe', oeffentlich.includes('Deine Auszeit für schöne Hände') && oeffentlich.includes('CHF 45') && !oeffentlich.includes('data-pe'));
await page.getByRole('button', { name: 'Weiter bearbeiten' }).click();
await page.waitForLoadState('load');
await leiste.getByText('Zeig mir, was ich ändern kann').waitFor();
await leiste.getByText('Zeig mir, was ich ändern kann').click();
await bild('pe-zeigen');
pruefe('nach Neuladen keine offenen Änderungen, kein Hinweis mehr', (await page.getByRole('button', { name: 'Alles klar' }).count()) === 0);

console.log('Kaputte Eingaben, Rückgängig, Verwerfen');
await ersetzeText('faq.json#titel', '');
await page.keyboard.press('Backspace');
await feld('faq.json#punkte.0.titel').click();
await page.locator('.pe-toast').waitFor();
pruefe('leerer Text → Hinweis, alter Text zurück', (await page.locator('.pe-toast').textContent()).includes('darf nicht leer') && (await feld('faq.json#titel').textContent()) === 'Gut zu wissen');
await ersetzeText('preise.json#leistungen.2.dauer', '30 Min. bis 1 Stunde ungefähr');
pruefe('Limit (16 Zeichen) greift mit Hinweis', (await feld('preise.json#leistungen.2.dauer').textContent()).length <= 16 && (await page.locator('.pe-pop-hinweis').textContent()).includes('Mehr Platz'));
await page.locator('.pe-pop').getByRole('button', { name: 'Rückgängig' }).click();
pruefe('Rückgängig pro Feld', (await feld('preise.json#leistungen.2.dauer').textContent()) === '30 Min.–1 Std.');
await ersetzeText('site.json#zeiten.hinweis', 'Nur mit Termin');
await ersetzeText('site.json#antwortzeit', 'Ich antworte schnell.');
await page.getByRole('button', { name: 'Verwerfen' }).click();
await page.getByRole('button', { name: 'Ja, verwerfen' }).click();
await leiste.getByText('Zeig mir').waitFor();
pruefe('Alles verwerfen', (await feld('site.json#zeiten.hinweis').textContent()) === 'Nur nach Vereinbarung' && (await leiste.textContent()).includes('Zeig mir'));
await ersetzeText('texte.json#anfahrt.titel', 'So findest du zu mir');
let warnung = false;
page.once('dialog', async (d) => { warnung = d.type() === 'beforeunload'; await d.dismiss(); });
await page.close({ runBeforeUnload: true });
await new Promise((r) => setTimeout(r, 500));
pruefe('Warnung beim Verlassen', warnung);

console.log('Fehlerfälle');
const p2 = await ctx.newPage();
p2.on('pageerror', (e) => { fehler++; console.log('  ✗ JS-Fehler', e.message); });
await p2.goto(`${BASIS}/bearbeiten`);
await p2.locator('[data-pe="texte.json#anfahrt.titel"]').waitFor();
pruefe('Entwurf nach Neuladen noch da', (await p2.locator('[data-pe="texte.json#anfahrt.titel"]').textContent()) === 'So findest du zu mir');
const seite = p2;
const shot2 = (n) => seite.screenshot({ path: `${SHOTS}/${n}.png` });

// Offline
await ctx.setOffline(true);
await seite.getByRole('button', { name: 'Veröffentlichen' }).click();
await seite.getByText('Keine Verbindung. Deine Änderungen sind gespeichert').waitFor();
await shot2('pe-fehler-offline');
pruefe('Offline-Text', true);
await seite.getByRole('button', { name: 'OK' }).click();
await ctx.setOffline(false);

// Sitzung abgelaufen
await ctx.clearCookies();
await seite.getByRole('button', { name: 'Veröffentlichen' }).click();
await seite.getByText('Bitte melde dich nochmal an. Deine Änderungen sind gespeichert.').waitFor();
await shot2('pe-fehler-abgelaufen');
pruefe('Abgelaufen-Text, Entwurf bleibt', (await seite.locator('[data-pe="texte.json#anfahrt.titel"]').textContent()) === 'So findest du zu mir');
await anmelden(seite);
await seite.getByText('Fertig, deine Änderungen sind online!').waitFor({ timeout: 120_000 });
pruefe('nach Neu-Anmeldung automatisch veröffentlicht', (await json('content/texte.json')).anfahrt.titel === 'So findest du zu mir');
await seite.getByRole('button', { name: 'Weiter bearbeiten' }).click();
await seite.waitForLoadState('load');

// Konflikt (gleiches Feld) und automatisches Zusammenführen (anderes Feld)
const ersetzeText2 = async (pfad, text) => {
  const f = seite.locator(`[data-pe="${pfad}"]`);
  await f.scrollIntoViewIfNeeded();
  await f.click();
  await seite.keyboard.press('ControlOrMeta+A');
  await seite.keyboard.type(text);
  await f.evaluate((e) => e.blur());
};
await seite.locator('.pe-status').getByText('Zeig mir').waitFor();
await ersetzeText2('site.json#hero.text', 'Julias neuer Text.');
await ersetzeText2('ueber.json#titel', 'Das bin ich');
const s1 = await json('content/site.json'); s1.hero.text = 'Ramons Text.';
const f1 = await json('content/faq.json'); f1.titel = 'Gut zu wissen!';
await fremd('content/site.json', ser(s1));
const fc = await fremd('content/faq.json', ser(f1));
await warteBisOnline(fc.commit);
await seite.getByRole('button', { name: 'Veröffentlichen' }).click();
await seite.getByText('Dieses Feld wurde inzwischen geändert. Deine Version behalten?').waitFor();
await shot2('pe-fehler-konflikt');
pruefe('Konflikt nur für das gleiche Feld', (await seite.locator('.pe-dialog').textContent()).includes('Ramons Text.'));
await seite.getByRole('button', { name: 'Meine behalten' }).click();
await seite.getByText('Fertig, deine Änderungen sind online!').waitFor({ timeout: 120_000 });
const s2 = await json('content/site.json'), u2 = await json('content/ueber.json'), f2 = await json('content/faq.json');
pruefe('Julias Version behalten, Ramons andere Änderung bleibt', s2.hero.text === 'Julias neuer Text.' && u2.titel === 'Das bin ich' && f2.titel === 'Gut zu wissen!');
await seite.getByRole('button', { name: 'Weiter bearbeiten' }).click();
await seite.waitForLoadState('load');

// Vorherige Veröffentlichung läuft noch
await ersetzeText2('site.json#zeiten.hinweis', 'Nur nach Absprache');
await seite.getByRole('button', { name: 'Veröffentlichen' }).click();
await seite.getByText('Super! Deine Änderungen sind in ca. 1 Minute online.').waitFor();
const p3 = await ctx.newPage();
await p3.goto(`${BASIS}/bearbeiten`);
await p3.getByText('Deine letzte Änderung wird gerade online gestellt …').waitFor({ timeout: 10_000 });
await p3.screenshot({ path: `${SHOTS}/pe-fehler-laeuft.png` });
pruefe('Hinweis «wird gerade online gestellt»', true);
await p3.waitForEvent('load', { timeout: 120_000 });
await p3.locator('.pe-status').getByText('Zeig mir').waitFor();
pruefe('danach bearbeitbar, neuer Stand geladen', (await p3.locator('[data-pe="site.json#zeiten.hinweis"]').textContent()) === 'Nur nach Absprache');
await p3.close();
await seite.getByRole('button', { name: 'Weiter bearbeiten' }).click();
await seite.waitForLoadState('load');

// Viele Veröffentlichungen im Monat
await fetch(`${BASIS}/_dev/monat?n=15`, { method: 'POST' });
await seite.reload();
await ersetzeText2('site.json#antwortzeit', 'Ich antworte meist am gleichen Tag.');
await seite.getByRole('button', { name: 'Veröffentlichen' }).click();
await seite.getByText('Du hast diesen Monat schon 15-mal veröffentlicht.').waitFor();
await shot2('pe-hinweis-sammeln');
await seite.getByRole('button', { name: 'Später' }).click();
pruefe('Sammel-Hinweis blockiert nicht, «Später» lässt Entwurf stehen', (await seite.locator('.pe-status').textContent()) === '1 Änderung');
await fetch(`${BASIS}/_dev/monat?n=0`, { method: 'POST' });

// Foto klappt nicht
const portraet2 = seite.locator('[data-pe="ueber.json#bild"]');
await portraet2.scrollIntoViewIfNeeded();
await portraet2.click();
const [wahl2] = await Promise.all([seite.waitForEvent('filechooser'), seite.getByRole('button', { name: 'Foto ersetzen' }).click()]);
await wahl2.setFiles(kaputt);
await seite.getByText('Dieses Foto klappt leider nicht.').waitFor();
await shot2('pe-fehler-foto');
pruefe('Foto-Fehlertext', true);
await seite.getByRole('button', { name: 'OK' }).click();
await seite.getByRole('button', { name: 'Verwerfen' }).click();
await seite.getByRole('button', { name: 'Ja, verwerfen' }).click();

// Bau schlägt fehl (z. B. kaputte Änderung von Ramon) → Seite bleibt online, freundlicher Text
const uOk = await datei('content/ueber.json');
const uKaputt = JSON.parse(uOk); uKaputt.bild = 'gibt-es-nicht.webp';
await fremd('content/ueber.json', ser(uKaputt));
await seite.reload();
await seite.getByText('Das hat nicht geklappt, Ramon ist informiert.').waitFor({ timeout: 120_000 });
await shot2('pe-fehler-bau');
const live = await (await fetch(`${BASIS}/`)).text();
pruefe('Bau-Fehler: Text, alte Seite bleibt online', live.includes('Das bin ich'));
await seite.getByRole('button', { name: 'Trotzdem weiterarbeiten' }).click();
const heil = await fremd('content/ueber.json', uOk);
await warteBisOnline(heil.commit);

// Falsches Passwort (eigene Sitzung)
const ctx2 = await browser.newContext(handy);
const p4 = await ctx2.newPage();
await p4.goto(`${BASIS}/bearbeiten`);
await p4.getByLabel('E-Mail').fill(zugang.email);
await p4.getByLabel('Passwort').fill('falsches-passwort');
await p4.getByRole('button', { name: 'Anmelden' }).click();
await p4.getByText('E-Mail oder Passwort stimmt nicht.').waitFor();
await p4.screenshot({ path: `${SHOTS}/pe-fehler-login.png` });
pruefe('Login-Fehlertext', true);

// Desktop-Ansicht für die Doku
const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'de-CH' });
await ctx3.addCookies(await ctx.cookies());
const p5 = await ctx3.newPage();
await p5.goto(`${BASIS}/bearbeiten`);
const ok5 = p5.getByRole('button', { name: 'Alles klar' });
await ok5.click({ timeout: 10_000 }).catch(() => {});
const t5 = p5.locator('[data-pe="site.json#hero.titel"]');
await t5.click();
await p5.keyboard.press('End');
await p5.keyboard.type('!');
await p5.screenshot({ path: `${SHOTS}/pe-desktop.png` });

await browser.close();
console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
