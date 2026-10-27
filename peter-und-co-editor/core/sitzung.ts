// Anmeldung: Passwort-Hash (scrypt), signiertes Sitzungs-Cookie (HMAC), CSRF-Token pro Sitzung.
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SITZUNG_TAGE = 30;
export const COOKIE = 'pe_sitzung';
const COOKIE_PFAD = '/api/pe';

const b64u = (b: Buffer) => b.toString('base64url');

function scryptAsync(pw: string, salt: Buffer, len: number, o: { N: number; r: number; p: number; maxmem: number }): Promise<Buffer> {
  return new Promise((res, rej) => scrypt(pw.normalize('NFC'), salt, len, o, (e, k) => (e ? rej(e) : res(k))));
}

/** Format: scrypt:N:r:p:salt:hash (base64url, ohne «$», damit es in .env-Dateien und der Netlify-Oberfläche heil bleibt). */
export async function hashPasswort(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const k = await scryptAsync(pw, salt, 32, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, b64u(salt), b64u(k)].join(':');
}

export async function pruefePasswort(pw: string, gespeichert: string): Promise<boolean> {
  const [art, N, r, p, salt, hash] = gespeichert.split(':');
  if (art !== 'scrypt' || !salt || !hash) return false;
  const soll = Buffer.from(hash, 'base64url');
  const ist = await scryptAsync(pw, Buffer.from(salt, 'base64url'), soll.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return ist.length === soll.length && timingSafeEqual(ist, soll);
}

const hmac = (secret: string, daten: string) => createHmac('sha256', secret).update(daten).digest();

function gleich(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface SitzungsDaten { e: string; x: number; n: string; f: string }

/** Fingerabdruck des Passwort-Hashes: neues Passwort → alte Sitzungen ungültig. */
const fingerabdruck = (secret: string, passwortHash: string) => b64u(hmac(secret, `pw:${passwortHash}`)).slice(0, 16);

export function erstelleSitzung(secret: string, passwortHash: string, email: string, jetzt = Date.now()): string {
  const daten: SitzungsDaten = { e: email, x: jetzt + SITZUNG_TAGE * 864e5, n: b64u(randomBytes(16)), f: fingerabdruck(secret, passwortHash) };
  const nutz = b64u(Buffer.from(JSON.stringify(daten)));
  return `${nutz}.${b64u(hmac(secret, nutz))}`;
}

export function leseSitzung(secret: string, passwortHash: string, email: string, token: string | undefined, jetzt = Date.now()): SitzungsDaten | null {
  if (!token || token.length > 1000) return null;
  const [nutz, sig, ...rest] = token.split('.');
  if (!nutz || !sig || rest.length) return null;
  if (!gleich(Buffer.from(sig, 'base64url'), hmac(secret, nutz))) return null;
  try {
    const d = JSON.parse(Buffer.from(nutz, 'base64url').toString()) as SitzungsDaten;
    if (d.e !== email || typeof d.x !== 'number' || d.x < jetzt || d.f !== fingerabdruck(secret, passwortHash)) return null;
    return d;
  } catch {
    return null;
  }
}

export const csrfFuer = (secret: string, nonce: string) => b64u(hmac(secret, `csrf:${nonce}`));

export function pruefeCsrf(secret: string, nonce: string, gesendet: string | null): boolean {
  return !!gesendet && gleich(Buffer.from(gesendet), Buffer.from(csrfFuer(secret, nonce)));
}

export function sitzungsCookie(token: string): string {
  return `${COOKIE}=${token}; Path=${COOKIE_PFAD}; HttpOnly; Secure; SameSite=Strict; Max-Age=${SITZUNG_TAGE * 86400}`;
}

export const abmeldeCookie = () => `${COOKIE}=; Path=${COOKIE_PFAD}; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function leseCookie(req: Request, name: string): string | undefined {
  for (const teil of (req.headers.get('cookie') ?? '').split(';')) {
    const [k, ...v] = teil.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

/** Zufälliges Session-Secret für die Einrichtung. */
export const neuesSecret = () => b64u(randomBytes(32));
