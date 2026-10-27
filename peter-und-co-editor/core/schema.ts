// Feld-Schema des Bearbeiten-Modus: gleiche Regeln für Browser, Functions und Build.
// Nur «erasable» TypeScript (Node führt die Datei ohne Build aus).

export type FeldTyp = 'text' | 'mehrzeilig' | 'zahl' | 'bild';

export interface FeldDef {
  typ: FeldTyp;
  /** Name für Julia und für die Commit-Nachricht, z. B. «Preis». */
  label: string;
  /** text/mehrzeilig: max. Zeichen. zahl: grösster Wert. */
  max?: number;
  /** Geschwister-Feld, dessen Wert die Stelle benennt, z. B. «name» → «Preis (Maniküre)». */
  bezug?: string;
  /** bild: Ordner der Datei (relativ zum Repo), Seitenverhältnis Breite/Höhe, längste Seite in px. */
  ordner?: string;
  verhaeltnis?: number;
  maxPx?: number;
  /** bild: Pfad des Alt-Text-Felds relativ zum Eintrag (gleiche Ebene), Vorlage für neue Fotos. */
  altFeld?: string;
  altVorlage?: string;
  /** Darf auf der Seite fehlen (Bereich ausgeblendet). */
  optional?: boolean;
}

export interface PeConfig {
  /** Name der Website (Texte im Editor). */
  site: string;
  /** Vorname der Person, die bearbeitet (Commit-Nachricht). */
  autorin: string;
  /** Ordner der Inhaltsdateien relativ zum Repo. */
  contentDir: string;
  /** Schlüssel: «datei.json#pfad.mit.*.platzhaltern». */
  felder: Record<string, FeldDef>;
}

export type Inhalte = Record<string, unknown>;

const DATEI = /^[a-z0-9-]+\.json$/;
const TEIL = /^[A-Za-z0-9_]+$/;
const VERBOTEN = new Set(['__proto__', 'prototype', 'constructor']);
export const BILD_DATEI = /^[a-z0-9-]+\.(webp|jpe?g|png|avif)$/;
export const BILD_MAX_BYTES = 1_200_000;

export interface Pfad { datei: string; teile: string[] }

/** «preise.json#leistungen.0.preisVon» → { datei, teile }; null bei ungültiger Form. */
export function parsePfad(pfad: unknown): Pfad | null {
  if (typeof pfad !== 'string' || pfad.length > 200) return null;
  const [datei, rest, ...zuviel] = pfad.split('#');
  if (zuviel.length || !rest || !DATEI.test(datei)) return null;
  const teile = rest.split('.');
  if (!teile.every((t) => TEIL.test(t) && !VERBOTEN.has(t))) return null;
  return { datei, teile };
}

/** Schema-Schlüssel zu einem konkreten Pfad (Zahlen → *). */
export function schemaSchluessel(p: Pfad): string {
  return `${p.datei}#${p.teile.map((t) => (/^\d+$/.test(t) ? '*' : t)).join('.')}`;
}

export function findeDef(config: PeConfig, pfad: string): FeldDef | null {
  const p = parsePfad(pfad);
  return p ? config.felder[schemaSchluessel(p)] ?? null : null;
}

/** Liest einen Wert; undefined, wenn der Pfad nicht existiert (nur eigene Eigenschaften). */
export function leseWert(obj: unknown, teile: string[]): unknown {
  let cur: unknown = obj;
  for (const t of teile) {
    if (cur === null || typeof cur !== 'object') return undefined;
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(t) || Number(t) >= cur.length) return undefined;
      cur = cur[Number(t)];
    } else {
      if (!Object.hasOwn(cur, t)) return undefined;
      cur = (cur as Record<string, unknown>)[t];
    }
  }
  return cur;
}

/** Setzt einen bestehenden Wert. Legt nie neue Schlüssel oder Einträge an. */
export function setzeWert(obj: unknown, teile: string[], wert: unknown): boolean {
  const eltern = leseWert(obj, teile.slice(0, -1));
  const letzter = teile[teile.length - 1];
  if (eltern === null || typeof eltern !== 'object') return false;
  if (Array.isArray(eltern)) {
    if (!/^\d+$/.test(letzter) || Number(letzter) >= eltern.length) return false;
    eltern[Number(letzter)] = wert;
    return true;
  }
  if (!Object.hasOwn(eltern, letzter)) return false;
  (eltern as Record<string, unknown>)[letzter] = wert;
  return true;
}

/** Reiner Text: HTML und Steuerzeichen raus, Leerraum normalisieren. */
export function bereinigeText(wert: string, mehrzeilig: boolean): string {
  let t = wert.normalize('NFC').replace(/\r\n?/g, '\n').replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  // eslint-disable-next-line no-control-regex
  t = t.replace(/[\u0000-\u0009\u000B-\u001F\u007F\u200B-\u200D\u2028\u2029\uFEFF]/g, '');
  t = mehrzeilig
    ? t.split('\n').map((z) => z.replace(/[ \t ]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n')
    : t.replace(/\s+/g, ' ');
  return t.trim();
}

export type Pruefung = { ok: true; wert: unknown } | { ok: false; fehler: 'leer' | 'zu_lang' | 'keine_zahl' | 'zahl_zu_gross' | 'typ' | 'bild_name' };

/** Prüft und bereinigt einen Wert gegen die Definition. */
export function pruefeWert(def: FeldDef, wert: unknown): Pruefung {
  switch (def.typ) {
    case 'text':
    case 'mehrzeilig': {
      if (typeof wert !== 'string') return { ok: false, fehler: 'typ' };
      const t = bereinigeText(wert, def.typ === 'mehrzeilig');
      if (!t) return { ok: false, fehler: 'leer' };
      if (def.max && [...t].length > def.max) return { ok: false, fehler: 'zu_lang' };
      return { ok: true, wert: t };
    }
    case 'zahl': {
      const n = typeof wert === 'string' && /^\d{1,6}$/.test(wert.trim()) ? Number(wert.trim()) : wert;
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return { ok: false, fehler: 'keine_zahl' };
      if (n > (def.max ?? 9999)) return { ok: false, fehler: 'zahl_zu_gross' };
      return { ok: true, wert: n };
    }
    case 'bild':
      return typeof wert === 'string' && BILD_DATEI.test(wert) ? { ok: true, wert } : { ok: false, fehler: 'bild_name' };
  }
}

export interface KonkretesFeld { pfad: string; schluessel: string; def: FeldDef; wert: unknown }

/** Alle konkreten Felder (Platzhalter über die bestehenden Einträge aufgelöst). */
export function alleFelder(config: PeConfig, inhalte: Inhalte): KonkretesFeld[] {
  const out: KonkretesFeld[] = [];
  for (const [schluessel, def] of Object.entries(config.felder)) {
    const p = parsePfad(schluessel.replace(/\*/g, '0'));
    if (!p) throw new Error(`pe.config: ungültiger Feld-Schlüssel «${schluessel}».`);
    const [datei, rest] = schluessel.split('#');
    const expand = (basis: unknown, teile: string[], weg: string[]) => {
      if (!teile.length) {
        if (basis !== undefined) out.push({ pfad: `${datei}#${weg.join('.')}`, schluessel, def, wert: basis });
        return;
      }
      const [t, ...weiter] = teile;
      if (t === '*') {
        if (Array.isArray(basis)) basis.forEach((x, i) => expand(x, weiter, [...weg, String(i)]));
        return;
      }
      expand(leseWert(basis, [t]), weiter, [...weg, t]);
    };
    expand(inhalte[datei], rest.split('.'), []);
  }
  return out;
}

/** Validiert alle Inhalte. bildExistiert prüft, ob die Datei im Ordner liegt. */
export function validiereInhalte(config: PeConfig, inhalte: Inhalte, bildExistiert: (ordner: string, datei: string) => boolean): string[] {
  const fehler: string[] = [];
  for (const f of alleFelder(config, inhalte)) {
    if (f.def.typ === 'zahl' && f.wert === null) continue; // null = «folgt» bzw. keine Spanne
    const r = pruefeWert(f.def, f.wert);
    if (!r.ok) {
      const grund = { leer: 'ist leer', zu_lang: `ist länger als ${f.def.max} Zeichen`, keine_zahl: 'ist keine ganze Zahl', zahl_zu_gross: `ist grösser als ${f.def.max ?? 9999}`, typ: 'hat den falschen Typ', bild_name: 'ist kein gültiger Bild-Dateiname' }[r.fehler];
      fehler.push(`${f.pfad} (${f.def.label}) ${grund}.`);
    } else if (f.def.typ === 'text' && r.wert !== f.wert) {
      fehler.push(`${f.pfad} (${f.def.label}) enthält HTML, Steuerzeichen oder überflüssige Leerzeichen.`);
    } else if (f.def.typ === 'bild' && !bildExistiert(f.def.ordner ?? '', String(f.wert))) {
      fehler.push(`${f.pfad} (${f.def.label}): Datei ${f.def.ordner}/${f.wert} fehlt.`);
    }
  }
  return fehler;
}

/** Lesbare Bezeichnung einer Stelle, z. B. «Preis (Maniküre)». */
export function bezeichnung(config: PeConfig, inhalte: Inhalte, pfad: string): string {
  const p = parsePfad(pfad);
  const def = p && config.felder[schemaSchluessel(p)];
  if (!p || !def) return pfad;
  if (!def.bezug) return def.label;
  const b = leseWert(inhalte[p.datei], [...p.teile.slice(0, -1), def.bezug]);
  return typeof b === 'string' && b ? `${def.label} (${b})` : def.label;
}

/** Einheitliches Format der Inhaltsdateien (gleich wie beim Speichern aus dem Editor). */
export const serialisiere = (obj: unknown) => `${JSON.stringify(obj, null, 2)}\n`;
