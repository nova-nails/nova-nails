// Schlüssel-Wert-Speicher für Rate-Limit und Zähler. Hosting-unabhängig: Netlify Blobs, später z. B. DynamoDB.

export interface KV {
  get<T>(k: string): Promise<T | null>;
  /** null löscht den Eintrag. */
  set(k: string, v: unknown): Promise<void>;
}

/** Arbeitsspeicher (lokal, Tests, Fallback). */
export function speicherImRam(): KV {
  const m = new Map<string, string>();
  return {
    get: async (k) => (m.has(k) ? JSON.parse(m.get(k)!) : null),
    set: async (k, v) => void (v === null ? m.delete(k) : m.set(k, JSON.stringify(v))),
  };
}

/** Fehlversuche zählen: max. «limit» in «fensterMin» Minuten. */
export async function zuVieleVersuche(kv: KV, schluessel: string, limit: number, fensterMin: number, jetzt = Date.now()) {
  const e = (await kv.get<{ n: number; start: number }>(schluessel)) ?? { n: 0, start: jetzt };
  const aktiv = jetzt - e.start < fensterMin * 60_000;
  return { gesperrt: aktiv && e.n >= limit, warteMin: aktiv ? Math.ceil((e.start + fensterMin * 60_000 - jetzt) / 60_000) : 0 };
}

export async function fehlversuch(kv: KV, schluessel: string, fensterMin: number, jetzt = Date.now()) {
  const e = (await kv.get<{ n: number; start: number }>(schluessel)) ?? { n: 0, start: jetzt };
  const neu = jetzt - e.start < fensterMin * 60_000 ? { n: e.n + 1, start: e.start } : { n: 1, start: jetzt };
  await kv.set(schluessel, neu);
}
