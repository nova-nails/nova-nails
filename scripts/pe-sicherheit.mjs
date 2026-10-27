// Sicherheitstests gegen den lokalen Server (npm run pe:dev): manipulierte Anfragen dürfen nichts schreiben.
// Aufruf: node scripts/pe-sicherheit.mjs [http://localhost:4335]
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const BASIS = process.argv[2] ?? 'http://localhost:4335';
const zugang = JSON.parse(readFileSync('peter-und-co-editor/dev/test-zugang.json', 'utf8'));
let ok = 0, fehler = 0;
const pruefe = (name, bed, info = '') => {
  if (bed) { ok++; console.log(`  ✓ ${name}`); } else { fehler++; console.log(`  ✗ ${name} ${info}`); }
};
const anfrage = (pfad, { methode = 'GET', body, cookie, csrf, origin = BASIS, typ = 'application/json' } = {}) =>
  fetch(`${BASIS}/api/pe/${pfad}`, {
    method: methode,
    headers: { ...(origin ? { Origin: origin } : {}), ...(typ ? { 'Content-Type': typ } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-PE-CSRF': csrf } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
const logVorher = await (await fetch(`${BASIS}/_dev/log`)).text();

console.log('Anmeldung');
pruefe('falsches Passwort → 401', (await anfrage('login', { methode: 'POST', body: { email: zugang.email, passwort: 'falsch-falsch' } })).status === 401);
pruefe('Login ohne Origin → 403', (await anfrage('login', { methode: 'POST', origin: null, body: zugang })).status === 403);
pruefe('Login von fremder Seite → 403', (await anfrage('login', { methode: 'POST', origin: 'https://boese.example', body: zugang })).status === 403);
const login = await anfrage('login', { methode: 'POST', body: zugang });
const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];
const { csrf } = await login.json();
pruefe('Login korrekt → Cookie HttpOnly, SameSite=Strict, Secure', login.status === 200 && /HttpOnly/.test(login.headers.get('set-cookie')) && /SameSite=Strict/.test(login.headers.get('set-cookie')) && /Secure/.test(login.headers.get('set-cookie')));
pruefe('gefälschtes Cookie → 401', (await anfrage('status', { cookie: 'pe_sitzung=eyJlIjoiYSJ9.AAAA' })).status === 401);
pruefe('Cookie mit verändertem Inhalt → 401', (await anfrage('status', { cookie: cookie.replace(/=(.)/, (_, c) => `=${c === 'e' ? 'f' : 'e'}`) })).status === 401);

console.log('Veröffentlichen ohne Berechtigung');
const gueltig = { aenderungen: [{ pfad: 'site.json#hero.titel', alt: 'x', neu: 'Test' }] };
pruefe('ohne Sitzung → 401', (await anfrage('veroeffentlichen', { methode: 'POST', body: gueltig, csrf })).status === 401);
pruefe('ohne CSRF → 403', (await anfrage('veroeffentlichen', { methode: 'POST', body: gueltig, cookie })).status === 403);
pruefe('falscher CSRF → 403', (await anfrage('veroeffentlichen', { methode: 'POST', body: gueltig, cookie, csrf: 'falsch' })).status === 403);
pruefe('fremde Origin → 403', (await anfrage('veroeffentlichen', { methode: 'POST', body: gueltig, cookie, csrf, origin: 'https://boese.example' })).status === 403);
pruefe('Formular statt JSON → 403', (await anfrage('veroeffentlichen', { methode: 'POST', body: 'a=b', cookie, csrf, typ: 'application/x-www-form-urlencoded' })).status === 403);

console.log('Manipulierte Inhalte (angemeldet)');
const sende = (body) => anfrage('veroeffentlichen', { methode: 'POST', body, cookie, csrf });
const status422 = async (name, body) => { const r = await sende(body); pruefe(`${name} → abgelehnt`, r.status === 422 || r.status === 400, `(${r.status} ${await r.text()})`); };
await status422('Feld nicht im Schema (Telefon)', { aenderungen: [{ pfad: 'site.json#telefon.anzeige', alt: '079 282 33 99', neu: '0900 666 666' }] });
await status422('Schalter (showGallery)', { aenderungen: [{ pfad: 'site.json#schalter.showGallery', alt: false, neu: true }] });
await status422('falscher Dateiname', { aenderungen: [{ pfad: '../package.json#name', alt: 'x', neu: 'y' }] });
await status422('fremde Datei', { aenderungen: [{ pfad: 'seo.json#titel', alt: 'x', neu: 'y' }] });
await status422('__proto__', { aenderungen: [{ pfad: 'site.json#__proto__.polluted', alt: null, neu: 'x' }] });
await status422('neuer Eintrag (Index 9)', { aenderungen: [{ pfad: 'preise.json#leistungen.9.name', alt: null, neu: 'Gratis' }] });
await status422('Text zu lang', { aenderungen: [{ pfad: 'site.json#hero.titel', alt: 'Deine Wohlfühl-Auszeit für die Hände', neu: 'x'.repeat(81) }] });
await status422('leerer Text', { aenderungen: [{ pfad: 'site.json#hero.titel', alt: 'Deine Wohlfühl-Auszeit für die Hände', neu: '   ' }] });
await status422('nur HTML', { aenderungen: [{ pfad: 'site.json#hero.titel', alt: 'Deine Wohlfühl-Auszeit für die Hände', neu: '<img src=x onerror=alert(1)>' }] });
await status422('Preis als Text', { aenderungen: [{ pfad: 'preise.json#leistungen.0.preisVon', alt: 120, neu: 'gratis' }] });
await status422('Preis negativ', { aenderungen: [{ pfad: 'preise.json#leistungen.0.preisVon', alt: 120, neu: -5 }] });
await status422('Preis zu gross', { aenderungen: [{ pfad: 'preise.json#leistungen.0.preisVon', alt: 120, neu: 100000 }] });
await status422('Preis-Spanne war leer (null)', { aenderungen: [{ pfad: 'preise.json#leistungen.0.preisBis', alt: null, neu: 200 }] });
await status422('Bild als Text-Änderung', { aenderungen: [{ pfad: 'ueber.json#bild', alt: 'julia-tellenbach.png', neu: '../../etc/passwd' }] });

const portraet = (b, h, opt = {}) => sharp({ create: { width: b, height: h, channels: 3, background: '#e7a1b0' } })[opt.png ? 'png' : 'webp']({ quality: 80 }).toBuffer();
const bild = async (buf, extra = {}) => ({ bilder: [{ pfad: 'ueber.json#bild', alt: 'julia-tellenbach.png', daten: buf.toString('base64'), ...extra }] });
await status422('Bild PNG statt JPEG/WebP', await bild(await portraet(444, 495, { png: true })));
await status422('Bild falsches Seitenverhältnis', await bild(await portraet(800, 400)));
await status422('Bild zu viele Pixel', await bild(await portraet(1800, 2007)));
await status422('Bild zu gross (> 1.2 MB)', await bild(Buffer.concat([await portraet(444, 495), Buffer.alloc(1_300_000)])));
await status422('Kein Bild (Text als base64)', await bild(Buffer.from('<?php echo 1; ?>')));
await status422('Bild in Textfeld-Pfad', { bilder: [{ pfad: 'site.json#hero.titel', alt: 'x', daten: (await portraet(444, 495)).toString('base64') }] });
pruefe('5 Bilder auf einmal → abgelehnt', (await sende({ bilder: Array(5).fill({ pfad: 'ueber.json#bild' }) })).status === 400);
pruefe('kaputtes JSON → abgelehnt', (await anfrage('veroeffentlichen', { methode: 'POST', body: '{"aenderungen":', cookie, csrf })).status === 413);

console.log('Bereinigung');
const r = await sende({ aenderungen: [{ pfad: 'faq.json#punkte.0.text', alt: 'Bar oder TWINT. Kartenzahlung ist noch nicht möglich.', neu: 'Bar <b>oder</b> TWINT.<script>alert(1)</script>  Karte\nfolgt.' }] });
const commit = (await r.json()).commit;
const faq = await (await fetch(`${BASIS}/_dev/datei?pfad=content/faq.json`)).text();
pruefe('HTML und Zeilenumbruch entfernt', r.status === 200 && faq.includes('"Bar oder TWINT.alert(1) Karte folgt."'), faq.slice(0, 200));
// zurücksetzen
await sende({ aenderungen: [{ pfad: 'faq.json#punkte.0.text', alt: 'Bar oder TWINT.alert(1) Karte folgt.', neu: 'Bar oder TWINT. Kartenzahlung ist noch nicht möglich.' }] });

console.log('Rate-Limit');
let gesperrt = false;
for (let i = 0; i < 7; i++) {
  const x = await anfrage('login', { methode: 'POST', body: { email: zugang.email, passwort: `falsch-${i}` } });
  if (x.status === 429) { gesperrt = true; break; }
}
pruefe('nach 5 Fehlversuchen gesperrt (429)', gesperrt);
pruefe('auch richtiges Passwort während Sperre → 429', (await anfrage('login', { methode: 'POST', body: zugang })).status === 429);

const logNachher = await (await fetch(`${BASIS}/_dev/log`)).text();
const neu = logNachher.split('\n').length - logVorher.split('\n').length;
pruefe('nur die 2 erlaubten Commits entstanden', neu === 2, `(${neu}, ${commit})`);
console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
