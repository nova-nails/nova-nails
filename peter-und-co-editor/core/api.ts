// API des Bearbeiten-Modus. Hosting-unabhängig (Web-Standard Request → Response): Netlify, lokaler Server, später AWS Lambda.
//   POST /api/pe/login            { email, passwort }
//   POST /api/pe/logout
//   GET  /api/pe/sitzung          → { angemeldet, csrf }
//   GET  /api/pe/status?commit=…  → { head, monat, deploy }
//   POST /api/pe/veroeffentlichen { aenderungen, bilder, behalten }
import {
  type PeConfig, type Inhalte, BILD_MAX_BYTES, bezeichnung, leseWert, parsePfad, pruefeWert, schemaSchluessel, serialisiere, setzeWert, validiereInhalte,
} from './schema.ts';
import type { FehlerCode } from './texte.ts';
import { bildInfo } from './bild.ts';
import { type DateiAenderung, type RepoZugriff, RepoFehler, VeraltetFehler } from './github.ts';
import { abmeldeCookie, COOKIE, csrfFuer, erstelleSitzung, leseCookie, leseSitzung, pruefeCsrf, pruefePasswort, sitzungsCookie } from './sitzung.ts';
import { type KV, fehlversuch, zuVieleVersuche } from './speicher.ts';
import type { DeployStatus } from './deploy.ts';

export interface ApiUmgebung {
  email: string;
  passwortHash: string;
  sessionSecret: string;
  repo: RepoZugriff;
  kv: KV;
  /** Optional: Stand des Deploys zu einem Commit. */
  deploy?: DeployStatus;
  log?: (...x: unknown[]) => void;
}

const MAX_BODY = 5_500_000;
const LOGIN_LIMIT_IP = 5;
const LOGIN_LIMIT_ALLE = 30;
const LOGIN_FENSTER_MIN = 15;

const json = (status: number, daten: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(daten), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const fehler = (status: number, code: FehlerCode, mehr: Record<string, unknown> = {}) => json(status, { fehler: code, ...mehr });

const monatSchluessel = (d = new Date()) => `veroeffentlicht:${d.toISOString().slice(0, 7)}`;
const gleich = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Gleiche Herkunft, JSON und (falls vom Browser gesendet) Sec-Fetch-Site → schützt zusammen mit SameSite=Strict und dem CSRF-Header. */
function fremdeAnfrage(req: Request): boolean {
  const origin = req.headers.get('origin');
  const site = req.headers.get('sec-fetch-site');
  if (!origin || origin !== new URL(req.url).origin) return true;
  if (site && site !== 'same-origin') return true;
  return !(req.headers.get('content-type') ?? '').startsWith('application/json');
}

async function leseJson(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try {
    const d = JSON.parse(text);
    return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
  } catch {
    return null;
  }
}

const zeitstempel = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

export function erstelleApi(config: PeConfig, env: ApiUmgebung) {
  const log = env.log ?? ((...x: unknown[]) => console.log('[pe]', ...x));

  function sitzung(req: Request) {
    return leseSitzung(env.sessionSecret, env.passwortHash, env.email, leseCookie(req, COOKIE));
  }

  /** Angemeldet + CSRF bei schreibenden Aufrufen. Gibt Response bei Fehler zurück. */
  function pruefeZugang(req: Request, schreibend: boolean): Response | null {
    if (schreibend && fremdeAnfrage(req)) return fehler(403, 'csrf');
    const s = sitzung(req);
    if (!s) return fehler(401, 'nicht_angemeldet');
    if (schreibend && !pruefeCsrf(env.sessionSecret, s.n, req.headers.get('x-pe-csrf'))) return fehler(403, 'csrf');
    return null;
  }

  async function login(req: Request) {
    if (fremdeAnfrage(req)) return fehler(403, 'csrf');
    const ip = req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unbekannt';
    for (const [k, limit] of [[`login:ip:${ip}`, LOGIN_LIMIT_IP], ['login:alle', LOGIN_LIMIT_ALLE]] as const) {
      const r = await zuVieleVersuche(env.kv, k, limit, LOGIN_FENSTER_MIN);
      if (r.gesperrt) return fehler(429, 'zu_viele_versuche', { warteMinuten: r.warteMin });
    }
    const body = await leseJson(req);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const pw = typeof body?.passwort === 'string' ? body.passwort : '';
    const ok = email === env.email.toLowerCase() && pw.length <= 200 && (await pruefePasswort(pw, env.passwortHash));
    if (!ok) {
      await fehlversuch(env.kv, `login:ip:${ip}`, LOGIN_FENSTER_MIN);
      await fehlversuch(env.kv, 'login:alle', LOGIN_FENSTER_MIN);
      log('Login fehlgeschlagen', ip);
      return fehler(401, 'login_falsch');
    }
    await env.kv.set(`login:ip:${ip}`, null);
    const neu = erstelleSitzung(env.sessionSecret, env.passwortHash, env.email);
    const s = leseSitzung(env.sessionSecret, env.passwortHash, env.email, neu)!;
    return json(200, { angemeldet: true, csrf: csrfFuer(env.sessionSecret, s.n) }, { 'Set-Cookie': sitzungsCookie(neu) });
  }

  async function status(req: Request) {
    const z = pruefeZugang(req, false);
    if (z) return z;
    const commit = new URL(req.url).searchParams.get('commit');
    const [head, monat] = await Promise.all([env.repo.head(), env.kv.get<number>(monatSchluessel())]);
    const deploy = commit && /^[0-9a-f]{7,40}$/.test(commit) && env.deploy ? await env.deploy.stand(commit).catch(() => null) : null;
    return json(200, { head, monat: monat ?? 0, deploy });
  }

  async function veroeffentlichen(req: Request) {
    const z = pruefeZugang(req, true);
    if (z) return z;
    const body = await leseJson(req);
    if (!body) return fehler(413, 'ungueltig', { grund: 'zu_gross' });
    const aenderungen = body.aenderungen ?? [];
    const bilder = body.bilder ?? [];
    const behalten = new Set(Array.isArray(body.behalten) ? body.behalten.filter((x): x is string => typeof x === 'string') : []);
    if (!Array.isArray(aenderungen) || !Array.isArray(bilder) || aenderungen.length > 300 || bilder.length > 4) return fehler(400, 'ungueltig', { grund: 'form' });

    for (let versuch = 0; versuch < 3; versuch++) {
      const head = await env.repo.head();
      const inhalte: Inhalte = {};
      const lade = async (datei: string) => {
        if (!(datei in inhalte)) {
          const text = await env.repo.datei(head, `${config.contentDir}/${datei}`);
          if (text == null) return undefined;
          inhalte[datei] = JSON.parse(text);
        }
        return inhalte[datei];
      };
      const geaendert = new Set<string>();
      const labels: string[] = [];
      const konflikte: { pfad: string; label: string; aktuell: unknown }[] = [];
      const dateien: DateiAenderung[] = [];

      for (const a of aenderungen as { pfad?: unknown; alt?: unknown; neu?: unknown }[]) {
        const p = parsePfad(a?.pfad);
        const def = p && config.felder[schemaSchluessel(p)];
        if (!p || !def || def.typ === 'bild') return fehler(422, 'ungueltig', { pfad: a?.pfad, grund: 'pfad' });
        const r = pruefeWert(def, a.neu);
        if (!r.ok) return fehler(422, 'ungueltig', { pfad: a.pfad, grund: r.fehler });
        const daten = await lade(p.datei);
        const aktuell = leseWert(daten, p.teile);
        if (aktuell === undefined || (def.typ === 'zahl' && aktuell === null)) return fehler(422, 'ungueltig', { pfad: a.pfad, grund: 'pfad' });
        if (gleich(aktuell, r.wert)) continue;
        if (!gleich(aktuell, a.alt) && !behalten.has(a.pfad as string)) {
          konflikte.push({ pfad: a.pfad as string, label: bezeichnung(config, inhalte, a.pfad as string), aktuell });
          continue;
        }
        setzeWert(daten, p.teile, r.wert);
        geaendert.add(p.datei);
        labels.push(bezeichnung(config, inhalte, a.pfad as string));
      }

      for (const b of bilder as { pfad?: unknown; alt?: unknown; daten?: unknown }[]) {
        const p = parsePfad(b?.pfad);
        const def = p && config.felder[schemaSchluessel(p)];
        if (!p || !def || def.typ !== 'bild' || !def.ordner) return fehler(422, 'ungueltig', { pfad: b?.pfad, grund: 'pfad' });
        if (typeof b.daten !== 'string' || b.daten.length > BILD_MAX_BYTES * 1.4) return fehler(422, 'ungueltig', { pfad: b.pfad, grund: 'bild_gross' });
        const buf = Buffer.from(b.daten, 'base64');
        const info = bildInfo(buf);
        if (!info) return fehler(422, 'ungueltig', { pfad: b.pfad, grund: 'bild_format' });
        if (buf.length > BILD_MAX_BYTES || Math.max(info.breite, info.hoehe) > (def.maxPx ?? 2000) + 1) return fehler(422, 'ungueltig', { pfad: b.pfad, grund: 'bild_gross' });
        if (def.verhaeltnis && Math.abs(info.breite / info.hoehe / def.verhaeltnis - 1) > 0.03) return fehler(422, 'ungueltig', { pfad: b.pfad, grund: 'bild_verhaeltnis' });
        const daten = await lade(p.datei);
        const aktuell = leseWert(daten, p.teile);
        if (typeof aktuell !== 'string') return fehler(422, 'ungueltig', { pfad: b.pfad, grund: 'pfad' });
        if (aktuell !== b.alt && !behalten.has(b.pfad as string)) {
          konflikte.push({ pfad: b.pfad as string, label: bezeichnung(config, inhalte, b.pfad as string), aktuell });
          continue;
        }
        const stamm = aktuell.replace(/\.[a-z]+$/, '').replace(/-\d{8}-\d{6}$/, '') || 'foto';
        const neuName = `${stamm}-${zeitstempel()}.${info.typ}`;
        dateien.push({ pfad: `${def.ordner}/${neuName}`, base64: b.daten });
        if (aktuell !== neuName) dateien.push({ pfad: `${def.ordner}/${aktuell}`, loeschen: true });
        setzeWert(daten, p.teile, neuName);
        geaendert.add(p.datei);
        labels.push(bezeichnung(config, inhalte, b.pfad as string));
      }

      if (konflikte.length) return fehler(409, 'konflikt', { konflikte, head });
      if (!geaendert.size) return json(200, { nichtsZuTun: true, commit: head });

      // Gesamte geänderte Dateien nochmals prüfen (gleiches Schema wie der Build)
      const nurGeaendert = Object.fromEntries([...geaendert].map((d) => [d, inhalte[d]]));
      const probleme = validiereInhalte(config, nurGeaendert, () => true);
      if (probleme.length) {
        log('Validierung nach Änderung fehlgeschlagen', probleme);
        return fehler(422, 'ungueltig', { grund: 'inhalt' });
      }
      for (const d of geaendert) dateien.push({ pfad: `${config.contentDir}/${d}`, text: serialisiere(inhalte[d]) });

      const eindeutig = [...new Set(labels)];
      const nachricht = `${config.autorin}: ${eindeutig.slice(0, 6).join(', ')}${eindeutig.length > 6 ? ` und ${eindeutig.length - 6} weitere` : ''}`;
      try {
        const commit = await env.repo.commit(head, dateien, nachricht, { name: config.autorin, email: env.email });
        const monat = ((await env.kv.get<number>(monatSchluessel())) ?? 0) + 1;
        await env.kv.set(monatSchluessel(), monat);
        log('Veröffentlicht', commit, nachricht);
        return json(200, { commit, monat });
      } catch (e) {
        if (e instanceof VeraltetFehler) continue; // jemand war schneller: mit neuem Stand nochmals
        throw e;
      }
    }
    return fehler(503, 'github', { grund: 'veraltet' });
  }

  async function route(req: Request): Promise<Response> {
    const pfad = new URL(req.url).pathname.replace(/\/$/, '');
    try {
      if (pfad === '/api/pe/login' && req.method === 'POST') return await login(req);
      if (pfad === '/api/pe/logout' && req.method === 'POST') return json(200, { angemeldet: false }, { 'Set-Cookie': abmeldeCookie() });
      if (pfad === '/api/pe/sitzung' && req.method === 'GET') {
        const s = sitzung(req);
        return json(200, s ? { angemeldet: true, csrf: csrfFuer(env.sessionSecret, s.n) } : { angemeldet: false });
      }
      if (pfad === '/api/pe/status' && req.method === 'GET') return await status(req);
      if (pfad === '/api/pe/veroeffentlichen' && req.method === 'POST') return await veroeffentlichen(req);
      return fehler(405, 'methode');
    } catch (e) {
      log('Fehler', pfad, e instanceof RepoFehler ? e.message : e);
      return fehler(502, 'github');
    }
  }

  return { route };
}
