// axe-Prüfung: öffentliche Startseite und Bearbeiten-Modus (Anmeldung, Leiste, Feld-Fenster). Server muss laufen.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASIS = process.argv[2] ?? 'http://localhost:4335';
const zugang = JSON.parse(readFileSync('peter-und-co-editor/dev/test-zugang.json', 'utf8'));
// Bekannt und gewollt (Farbcode der Kundin, docs/design-system.md): color-contrast der Website selbst
const BEKANNT = new Set(['color-contrast']);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
let neu = 0;
const pruefe = async (name, include) => {
  const b = new AxeBuilder({ page });
  if (include) b.include(include);
  const r = await b.analyze();
  const v = r.violations.filter((x) => !BEKANNT.has(x.id) || include);
  console.log(`${name}: ${v.length ? v.map((x) => `${x.id} (${x.nodes.length})`).join(', ') : '0 Befunde'}${r.violations.some((x) => BEKANNT.has(x.id)) && !include ? ' (+ bekannt: color-contrast)' : ''}`);
  neu += v.length;
};
await page.goto(`${BASIS}/`);
await pruefe('Startseite /');
await page.goto(`${BASIS}/bearbeiten`);
await page.getByLabel('E-Mail').waitFor();
await pruefe('Anmeldung', '.pe-dialog');
await page.getByLabel('E-Mail').fill(zugang.email);
await page.getByLabel('Passwort').fill(zugang.passwort);
await page.getByRole('button', { name: 'Anmelden' }).click();
await page.getByRole('button', { name: 'Alles klar' }).waitFor();
await pruefe('Hinweis', '.pe-dialog');
await page.getByRole('button', { name: 'Alles klar' }).click();
await page.locator('[data-pe="site.json#hero.titel"]').click();
await page.keyboard.type('!');
await pruefe('Leiste', '.pe-leiste');
await pruefe('Feld-Fenster', '.pe-pop');
await browser.close();
process.exit(neu ? 1 : 0);
