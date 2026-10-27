// Werkzeuge für Build und Einrichtung:
//   node peter-und-co-editor/build/pe.ts vorbereiten   Build-Info für die Functions schreiben + Inhalte prüfen (vor astro build)
//   node peter-und-co-editor/build/pe.ts inhalte       nur Inhalte prüfen
//   node peter-und-co-editor/build/pe.ts seite         dist prüfen: data-pe ↔ Schema, öffentliche Seiten ohne data-pe
//   node peter-und-co-editor/build/pe.ts passwort      Passwort-Hash (und Session-Secret) für Netlify erzeugen
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { alleFelder, schemaSchluessel, parsePfad, validiereInhalte, type Inhalte, type PeConfig } from '../core/schema.ts';
import { hashPasswort, neuesSecret } from '../core/sitzung.ts';
import { buildInfo } from './build-info.ts';

const root = process.cwd();
const config: PeConfig = (await import(pathToFileURL(join(root, 'pe.config.ts')).href)).default;

function ladeInhalte(): Inhalte {
  const dateien = new Set(Object.keys(config.felder).map((k) => k.split('#')[0]));
  return Object.fromEntries([...dateien].map((d) => [d, JSON.parse(readFileSync(join(root, config.contentDir, d), 'utf8'))]));
}

function pruefeInhalte() {
  const inhalte = ladeInhalte();
  const fehler = validiereInhalte(config, inhalte, (ordner, datei) => existsSync(join(root, ordner, datei)));
  // Tippfehler im Schema: jeder Schlüssel muss mindestens eine Stelle treffen
  const getroffen = new Set(alleFelder(config, inhalte).map((f) => f.schluessel));
  for (const [k, def] of Object.entries(config.felder)) if (!def.optional && !getroffen.has(k)) fehler.push(`pe.config.ts: «${k}» trifft keine Stelle in ${config.contentDir}/.`);
  if (fehler.length) {
    console.error(`\n✗ Inhalte ungültig, Build abgebrochen (die Website online bleibt unverändert):\n  - ${fehler.join('\n  - ')}\n`);
    process.exit(1);
  }
  console.log(`✓ Inhalte gültig (${getroffen.size} Feld-Typen)`);
}

function pruefeSeite() {
  const dist = join(root, 'dist');
  const seite = join(dist, 'bearbeiten.html');
  if (!existsSync(seite)) {
    console.error('✗ dist/bearbeiten.html fehlt. Zuerst bauen (npm run build).');
    process.exit(1);
  }
  const html = readFileSync(seite, 'utf8');
  const aufSeite = new Set([...html.matchAll(/data-pe="([^"]+)"/g)].map((m) => m[1]));
  const felder = alleFelder(config, ladeInhalte());
  const imSchema = new Set(felder.map((f) => f.pfad));
  // Alt-Text-Felder werden über ihr Bild bearbeitet
  const ueberBild = new Set<string>();
  for (const f of felder) {
    if (f.def.typ !== 'bild' || !f.def.altFeld) continue;
    const p = parsePfad(f.pfad)!;
    ueberBild.add(`${p.datei}#${[...p.teile.slice(0, -1), f.def.altFeld].join('.')}`);
  }
  const fehler: string[] = [];
  for (const p of aufSeite) if (!imSchema.has(p)) fehler.push(`data-pe="${p}" steht nicht in pe.config.ts`);
  for (const f of felder) {
    if (aufSeite.has(f.pfad) || f.def.optional || ueberBild.has(f.pfad)) continue;
    if (f.def.typ === 'zahl' && f.wert === null) continue;
    fehler.push(`${f.pfad} (${schemaSchluessel(parsePfad(f.pfad)!)}) fehlt auf /bearbeiten`);
  }
  for (const d of readdirSync(dist).filter((x) => x.endsWith('.html') && x !== 'bearbeiten.html')) {
    if (/data-pe[=\s>]|pe-daten/.test(readFileSync(join(dist, d), 'utf8'))) fehler.push(`dist/${d} enthält Bearbeiten-Code`);
  }
  if (fehler.length) {
    console.error(`\n✗ Bearbeiten-Seite passt nicht zum Schema:\n  - ${fehler.join('\n  - ')}\n`);
    process.exit(1);
  }
  console.log(`✓ /bearbeiten: ${aufSeite.size} änderbare Stellen, alle im Schema; öffentliche Seiten ohne Bearbeiten-Code`);
}

async function frage(text: string, versteckt: boolean): Promise<string> {
  if (!process.stdin.isTTY) {
    const zeilen = createInterface({ input: process.stdin });
    for await (const z of zeilen) return z;
    return '';
  }
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const schreibe = (rl as unknown as { _writeToOutput: (s: string) => void });
    rl.question(text, (a) => { rl.close(); process.stdout.write('\n'); res(a); });
    if (versteckt) schreibe._writeToOutput = (s: string) => { if (s.startsWith(text)) process.stdout.write(text); };
  });
}

const befehl = process.argv[2];
if (befehl === 'vorbereiten') {
  mkdirSync(join(root, 'peter-und-co-editor/generated'), { recursive: true });
  const info = buildInfo();
  writeFileSync(join(root, 'peter-und-co-editor/generated/build-info.ts'), `// Beim Build erzeugt (pe.ts vorbereiten), nicht bearbeiten.\nexport default ${JSON.stringify(info, null, 2)};\n`);
  console.log(`✓ Build-Info: ${info.repo || '(kein Repo)'} · ${info.branch} · ${info.commit.slice(0, 7)}`);
  pruefeInhalte();
} else if (befehl === 'inhalte') pruefeInhalte();
else if (befehl === 'seite') pruefeSeite();
else if (befehl === 'passwort') {
  const pw = await frage('Neues Passwort (mind. 10 Zeichen): ', true);
  if (pw.length < 10) {
    console.error('✗ Zu kurz. Mindestens 10 Zeichen.');
    process.exit(1);
  }
  console.log('\nIn Netlify unter Site configuration → Environment variables eintragen (Scope: Functions):\n');
  console.log(`PE_PASSWORT_HASH  ${await hashPasswort(pw)}`);
  console.log(`\nNur bei der ersten Einrichtung (ein Wechsel meldet alle ab):\nPE_SESSION_SECRET ${neuesSecret()}\n`);
} else {
  console.error('Befehl: vorbereiten | inhalte | seite | passwort');
  process.exit(1);
}
