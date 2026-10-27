// Aufrufe an /api/pe/*. Netzwerkfehler werden zu «offline», Details nur in die Konsole.

export class ApiFehler extends Error {
  constructor(public code: string, public status: number, public daten: Record<string, unknown> = {}) {
    super(code);
  }
}

let csrf = '';
export const setzeCsrf = (c: string) => { csrf = c; };

export async function api<T = Record<string, unknown>>(pfad: string, opt: { methode?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  if (navigator.onLine === false) throw new ApiFehler('offline', 0);
  let r: Response;
  try {
    r = await fetch(`/api/pe/${pfad}`, {
      method: opt.methode ?? 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: opt.methode === 'POST' ? { 'Content-Type': 'application/json', 'X-PE-CSRF': csrf } : {},
      body: opt.body === undefined ? undefined : JSON.stringify(opt.body),
    });
  } catch (e) {
    console.warn('[pe] Netzwerk', e);
    throw new ApiFehler('offline', 0);
  }
  const daten = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    console.warn('[pe]', pfad, r.status, daten);
    throw new ApiFehler(typeof daten.fehler === 'string' ? daten.fehler : 'unbekannt', r.status, daten);
  }
  return daten as T;
}

/** Welcher Commit ist online? (statische Datei vom Build) */
export async function onlineCommit(): Promise<string | null> {
  try {
    const r = await fetch(`/pe-version.json?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? ((await r.json()) as { commit: string }).commit : null;
  } catch {
    return null;
  }
}
