// Peter & Co Editor im Browser: Texte, Zahlen und Fotos direkt auf der Seite ändern, gesammelt veröffentlichen.
import './editor.css';
import { bereinigeText } from '../core/schema.ts';
import { T, t } from '../core/texte.ts';
import { api, ApiFehler, onlineCommit, setzeCsrf } from './api.ts';
import { blobZuDataUrl, exportiere, ladeBild, zuschneiden } from './bild.ts';
import { dialog, el, frage, icon, ICON, toast } from './ui.ts';

interface Feld {
  typ: 'text' | 'mehrzeilig' | 'zahl' | 'bild';
  label: string;
  max?: number;
  verhaeltnis?: number;
  maxPx?: number;
  altVorlage?: string;
  altPfad?: string;
  wert: unknown;
}
interface Daten { site: string; commit: string; felder: Record<string, Feld> }
interface Entwurf {
  texte: Record<string, { alt: unknown; neu: unknown }>;
  bilder: Record<string, { alt: string; daten: string }>;
}

const VIEL_VEROEFFENTLICHT = 15;
const WARTEN_MAX_MS = 10 * 60_000;

let daten: Daten;
let entwurf: Entwurf = { texte: {}, bilder: {} };
let monat = 0;
let speicherVollGemeldet = false;
let ohneWarnung = false;
/** Neu laden ohne «Seite verlassen?»-Frage (Entwurf ist gespeichert). */
const neuLaden = () => { ohneWarnung = true; location.reload(); };
const knoten = new Map<string, HTMLElement>();
const originalBild = new Map<string, { src: string; srcset: string | null; sizes: string | null; alt: string }>();

// ---------- Speicher (localStorage kann fehlen oder voll sein) ----------
const schluessel = (k: string) => `pe:${daten.site}:${k}`;
function lsLesen<T>(k: string): T | null {
  try {
    const v = localStorage.getItem(schluessel(k));
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function lsSchreiben(k: string, v: unknown): boolean {
  try {
    if (v === null) localStorage.removeItem(schluessel(k));
    else localStorage.setItem(schluessel(k), JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
function speichern() {
  if (lsSchreiben('entwurf', entwurf)) return;
  // Zu gross (Fotos): wenigstens die Texte sichern
  lsSchreiben('entwurf', { texte: entwurf.texte, bilder: {} });
  if (Object.keys(entwurf.bilder).length && !speicherVollGemeldet) {
    speicherVollGemeldet = true;
    toast(T.fotoSpeicherVoll, 7000);
  }
}

// ---------- Werte lesen/schreiben ----------
const laenge = (s: string) => [...s].length;
function domWert(e: HTMLElement, f: Feld): string {
  return f.typ === 'mehrzeilig' ? e.innerText.replace(/\n$/, '') : e.textContent ?? '';
}
function setzeDom(e: HTMLElement, f: Feld, v: unknown) {
  if (f.typ === 'mehrzeilig') e.innerText = String(v);
  else e.textContent = String(v);
}
const aktuellerWert = (pfad: string) => (pfad in entwurf.texte ? entwurf.texte[pfad].neu : daten.felder[pfad]?.wert);
const anzahl = () => Object.keys(entwurf.texte).length + Object.keys(entwurf.bilder).length;

function setzeAenderung(pfad: string, neu: unknown) {
  const f = daten.felder[pfad];
  if (JSON.stringify(neu) === JSON.stringify(f.wert)) delete entwurf.texte[pfad];
  else entwurf.texte[pfad] = { alt: entwurf.texte[pfad]?.alt ?? f.wert, neu };
  knoten.get(pfad)?.classList.toggle('pe-geaendert', pfad in entwurf.texte);
  speichern();
  aktualisiereLeiste();
}

// ---------- Leiste, Menü, Feld-Fenster ----------
let statusEl: HTMLElement, verwerfenKnopf: HTMLButtonElement, veroeffentlichenKnopf: HTMLButtonElement, menue: HTMLElement | null = null;
let pop: HTMLElement, popZaehler: HTMLElement, popHinweis: HTMLElement, popRueck: HTMLButtonElement, popTitel: HTMLElement, stift: HTMLElement;
let aktivPfad: string | null = null;
const dateiWahl = el('input', { type: 'file', accept: 'image/*', hidden: true, 'aria-hidden': 'true', tabindex: '-1' });

function baueUi() {
  statusEl = el('div', { class: 'pe-status', 'aria-live': 'polite' });
  verwerfenKnopf = el('button', { type: 'button', class: 'pe-knopf pe-rand', onclick: allesVerwerfen }, T.verwerfen);
  veroeffentlichenKnopf = el('button', { type: 'button', class: 'pe-knopf pe-haupt', onclick: veroeffentlichen }, T.veroeffentlichen);
  const mehrKnopf = el('button', { type: 'button', class: 'pe-knopf pe-rand pe-mehr', 'aria-label': T.mehr, 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: () => schalteMenue(mehrKnopf) }, icon(ICON.mehr));
  const leiste = el('div', { class: 'pe-ui pe-leiste', role: 'region', 'aria-label': 'Bearbeiten' }, statusEl, el('div', { class: 'pe-knoepfe' }, verwerfenKnopf, veroeffentlichenKnopf), mehrKnopf);

  popTitel = el('div', { class: 'pe-pop-titel' });
  popZaehler = el('span', { class: 'pe-zaehler' });
  popRueck = el('button', { type: 'button', class: 'pe-knopf pe-rand', onclick: () => aktivPfad && feldZuruecksetzen(aktivPfad) }, T.rueckgaengig);
  popHinweis = el('div', { class: 'pe-pop-hinweis', role: 'status' });
  pop = el('div', { class: 'pe-ui pe-pop', hidden: true }, popTitel, popZaehler, popRueck, popHinweis);
  // Klicks im Fenster nehmen dem Text nicht den Fokus
  pop.addEventListener('pointerdown', (e) => { if (!(e.target as HTMLElement).closest('input,textarea')) e.preventDefault(); });
  stift = el('div', { class: 'pe-stift', hidden: true, 'aria-hidden': 'true' }, icon(ICON.stift));
  document.body.append(leiste, pop, stift, dateiWahl);
  aktualisiereLeiste();
}

function aktualisiereLeiste() {
  const n = anzahl();
  statusEl.replaceChildren(n ? (n === 1 ? T.aenderungen1 : t('aenderungenN', { n })) : el('button', { type: 'button', class: 'pe-text-knopf', onclick: zeigen }, T.zeigen));
  verwerfenKnopf.disabled = !n;
  veroeffentlichenKnopf.disabled = !n;
}

function schalteMenue(knopf: HTMLButtonElement) {
  if (menue) return schliesseMenue(knopf);
  const punkt = (label: string, fn: () => void) => el('button', { type: 'button', role: 'menuitem', onclick: () => { schliesseMenue(knopf); fn(); } }, label);
  menue = el('div', { class: 'pe-ui pe-menue', role: 'menu' },
    punkt(T.zeigen, zeigen),
    punkt(T.hilfe, () => zeigeHinweis()),
    el('a', { href: '/', target: '_blank', rel: 'noopener', role: 'menuitem', onclick: () => schliesseMenue(knopf) }, T.ansehen),
    punkt(T.abmelden, abmelden),
  );
  document.body.append(menue);
  knopf.setAttribute('aria-expanded', 'true');
  (menue.querySelector('button') as HTMLElement).focus();
  const zu = (e: Event) => {
    if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menue?.contains(e.target as Node) && !knopf.contains(e.target as Node)) {
      schliesseMenue(knopf);
      if (e instanceof KeyboardEvent) knopf.focus();
    }
  };
  setTimeout(() => { document.addEventListener('pointerdown', zu); document.addEventListener('keydown', zu); });
  menueAufraeumen = () => { document.removeEventListener('pointerdown', zu); document.removeEventListener('keydown', zu); };
}
let menueAufraeumen = () => {};
function schliesseMenue(knopf: HTMLButtonElement) {
  menue?.remove();
  menue = null;
  knopf.setAttribute('aria-expanded', 'false');
  menueAufraeumen();
}

function zeigen() {
  document.documentElement.classList.add('pe-zeigen');
  setTimeout(() => document.documentElement.classList.remove('pe-zeigen'), 3400);
}

function zeigeHinweis(): Promise<unknown> {
  return frage(T.loginTitel, T.hinweis, [{ label: T.hinweisOk, wert: 'ok', haupt: true }]);
}

/** Fenster unter (oder über) dem Element, in Dokument-Koordinaten: scrollt mit, verschiebt nichts. */
function platziere(ziel: HTMLElement, box: HTMLElement, abstand = 10) {
  const r = ziel.getBoundingClientRect();
  box.hidden = false;
  const b = box.offsetWidth, h = box.offsetHeight;
  const unten = window.innerWidth < 720 ? 150 : 110;
  let top = r.bottom + abstand;
  if (top + h > window.innerHeight - unten && r.top - abstand - h > 8) top = r.top - abstand - h;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - b - 8);
  box.style.top = `${top + window.scrollY}px`;
  box.style.left = `${left + window.scrollX}px`;
}

function zeigeStift(e: HTMLElement) {
  const r = e.getBoundingClientRect();
  stift.hidden = false;
  stift.style.top = `${Math.max(0, r.top + window.scrollY - 14)}px`;
  stift.style.left = `${Math.min(r.right + window.scrollX - 16, window.scrollX + window.innerWidth - 34)}px`;
}

function zeigeFeldFenster(pfad: string, e: HTMLElement) {
  const f = daten.felder[pfad];
  aktivPfad = pfad;
  popTitel.textContent = f.label;
  popHinweis.textContent = '';
  aktualisiereZaehler(pfad, e);
  platziere(e, pop);
  zeigeStift(e);
}

function aktualisiereZaehler(pfad: string, e: HTMLElement) {
  const f = daten.felder[pfad];
  if (f.typ === 'zahl' || !f.max) popZaehler.textContent = '';
  else {
    const n = laenge(domWert(e, f));
    popZaehler.textContent = `${n} / ${f.max}`;
    popZaehler.classList.toggle('pe-knapp', n >= f.max * 0.9);
  }
  popRueck.hidden = !(pfad in entwurf.texte);
}

function hinweis(text: string) {
  popHinweis.textContent = text;
  if (aktivPfad) platziere(knoten.get(aktivPfad)!, pop);
}

// ---------- Text- und Zahlenfelder ----------
const plaintextOk = (() => {
  const d = document.createElement('div');
  d.contentEditable = 'plaintext-only';
  return d.contentEditable === 'plaintext-only';
})();

function auswahlLaenge(e: HTMLElement) {
  const s = getSelection();
  return s && s.rangeCount && e.contains(s.anchorNode) ? laenge(s.toString()) : 0;
}

function bindeText(pfad: string, e: HTMLElement, f: Feld) {
  e.contentEditable = plaintextOk ? 'plaintext-only' : 'true';
  e.setAttribute('role', 'textbox');
  e.setAttribute('aria-label', f.label);
  e.spellcheck = f.typ !== 'zahl';
  if (f.typ === 'mehrzeilig') e.setAttribute('aria-multiline', 'true');
  if (f.typ === 'zahl') e.setAttribute('inputmode', 'numeric');
  const maxLaenge = f.typ === 'zahl' ? String(f.max ?? 9999).length : f.max;

  e.addEventListener('focus', () => { e.classList.add('pe-aktiv'); zeigeFeldFenster(pfad, e); });
  e.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') zeigeStift(e); });
  e.addEventListener('pointerleave', () => { if (aktivPfad !== pfad) stift.hidden = true; });
  e.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') e.blur();
    if (ev.key === 'Enter' && f.typ !== 'mehrzeilig') { ev.preventDefault(); e.blur(); }
  });
  e.addEventListener('beforeinput', (ev) => {
    if ((ev.inputType === 'insertParagraph' || ev.inputType === 'insertLineBreak') && f.typ !== 'mehrzeilig') return ev.preventDefault();
    if (ev.inputType === 'insertFromDrop') return ev.preventDefault();
    if (!ev.inputType.startsWith('insert') || ev.data == null || ev.inputType === 'insertFromPaste') return;
    if (f.typ === 'zahl' && !/^\d*$/.test(ev.data)) {
      ev.preventDefault();
      return hinweis(t('zahlHinweis', { beispiel: String(daten.felder[pfad].wert ?? 90) }));
    }
    if (maxLaenge && laenge(domWert(e, f)) - auswahlLaenge(e) + laenge(ev.data) > maxLaenge) {
      ev.preventDefault();
      hinweis(f.typ === 'zahl' ? t('zahlZuGross', { max: f.max ?? 9999 }) : T.limitHinweis);
    }
  });
  e.addEventListener('paste', (ev) => {
    ev.preventDefault();
    let text = ev.clipboardData?.getData('text/plain') ?? '';
    if (f.typ === 'zahl') {
      if (/\D/.test(text.trim())) hinweis(t('zahlHinweis', { beispiel: String(f.wert ?? 90) }));
      text = text.replace(/\D/g, '');
    } else text = f.typ === 'mehrzeilig' ? text.replace(/\r\n?/g, '\n') : text.replace(/\s+/g, ' ');
    if (maxLaenge) {
      const platz = Math.max(0, maxLaenge - (laenge(domWert(e, f)) - auswahlLaenge(e)));
      if (laenge(text) > platz) hinweis(f.typ === 'zahl' ? t('zahlZuGross', { max: f.max ?? 9999 }) : T.limitHinweis);
      text = [...text].slice(0, platz).join('');
    }
    document.execCommand('insertText', false, text);
  });
  e.addEventListener('drop', (ev) => ev.preventDefault());
  e.addEventListener('input', () => {
    const roh = domWert(e, f);
    if (f.typ === 'zahl') {
      const z = roh.trim();
      if (/^\d+$/.test(z)) {
        if (Number(z) > (f.max ?? 9999)) hinweis(t('zahlZuGross', { max: f.max ?? 9999 }));
        else setzeAenderung(pfad, Number(z));
      }
    } else {
      const v = bereinigeText(roh, f.typ === 'mehrzeilig');
      if (v) setzeAenderung(pfad, v);
      popHinweis.textContent = '';
    }
    aktualisiereZaehler(pfad, e);
    platziere(e, pop);
  });
  e.addEventListener('blur', () => {
    e.classList.remove('pe-aktiv');
    const roh = domWert(e, f).trim();
    const leer = f.typ === 'zahl' ? !/^\d+$/.test(roh) || Number(roh) > (f.max ?? 9999) : !bereinigeText(roh, f.typ === 'mehrzeilig');
    if (leer) {
      setzeDom(e, f, aktuellerWert(pfad));
      toast(f.typ === 'zahl' ? t('zahlHinweis', { beispiel: String(f.wert ?? 90) }) : T.leerHinweis);
    }
    setTimeout(() => {
      if (document.activeElement === e) return;
      if (aktivPfad === pfad) { pop.hidden = true; stift.hidden = true; aktivPfad = null; }
    }, 120);
  });
}

function feldZuruecksetzen(pfad: string) {
  const f = daten.felder[pfad];
  const e = knoten.get(pfad);
  if (f.typ === 'bild') return bildZuruecksetzen(pfad);
  if (e) setzeDom(e, f, f.wert);
  setzeAenderung(pfad, f.wert);
  if (e && document.activeElement === e) aktualisiereZaehler(pfad, e);
}

// ---------- Fotos ----------
function bindeBild(pfad: string, img: HTMLImageElement, f: Feld) {
  originalBild.set(pfad, { src: img.currentSrc || img.src, srcset: img.getAttribute('srcset'), sizes: img.getAttribute('sizes'), alt: img.alt });
  img.tabIndex = 0;
  img.setAttribute('role', 'button');
  img.setAttribute('aria-label', `${f.label} ändern`);
  img.loading = 'eager';
  const oeffnen = () => bildFenster(pfad, img, f);
  img.addEventListener('click', oeffnen);
  img.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); oeffnen(); } });
  img.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') zeigeStift(img); });
  img.addEventListener('pointerleave', () => { if (aktivPfad !== pfad) stift.hidden = true; });
}

function bildFenster(pfad: string, img: HTMLImageElement, f: Feld) {
  aktivPfad = pfad;
  img.classList.add('pe-aktiv');
  popTitel.textContent = f.label;
  popZaehler.textContent = '';
  popHinweis.textContent = '';
  popRueck.hidden = !(pfad in entwurf.bilder) && !(f.altPfad && f.altPfad in entwurf.texte);
  const ersetzen = el('button', { type: 'button', class: 'pe-knopf pe-haupt pe-extra', onclick: () => fotoWaehlen(pfad, img, f) }, T.fotoErsetzen);
  const beschreibung = f.altPfad ? el('button', { type: 'button', class: 'pe-knopf pe-rand pe-extra', onclick: () => altBearbeiten(pfad, img, f) }, T.fotoBeschreibung) : null;
  pop.querySelectorAll('.pe-extra').forEach((x) => x.remove());
  popZaehler.after(...[ersetzen, beschreibung].filter((x): x is HTMLButtonElement => !!x));
  platziere(img, pop);
  zeigeStift(img);
  ersetzen.focus();
  const weg = (ev: Event) => {
    if (pop.contains(ev.target as Node) || ev.target === img) return;
    if (ev instanceof KeyboardEvent && ev.key !== 'Escape') return;
    schliesseBildFenster(pfad, img);
    document.removeEventListener('pointerdown', weg);
    document.removeEventListener('keydown', weg);
  };
  setTimeout(() => { document.addEventListener('pointerdown', weg); document.addEventListener('keydown', weg); });
}

function schliesseBildFenster(pfad: string, img: HTMLImageElement) {
  img.classList.remove('pe-aktiv');
  pop.querySelectorAll('.pe-extra').forEach((x) => x.remove());
  if (aktivPfad === pfad) { pop.hidden = true; stift.hidden = true; aktivPfad = null; }
}

function zeigeBild(img: HTMLImageElement, src: string) {
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  img.src = src;
}

function fotoWaehlen(pfad: string, img: HTMLImageElement, f: Feld) {
  dateiWahl.value = '';
  dateiWahl.onchange = async () => {
    const datei = dateiWahl.files?.[0];
    schliesseBildFenster(pfad, img);
    if (!datei) return;
    toast(T.fotoLaedt, 2500);
    let quelle: HTMLImageElement;
    try {
      quelle = await ladeBild(datei);
      document.querySelector('.pe-toast')?.remove();
    } catch (e) {
      console.warn('[pe] Foto nicht lesbar', datei.type, e);
      await frage(T.fotoErsetzen, T.fotoKaputt, [{ label: T.ok, wert: 'ok', haupt: true }]);
      return;
    }
    const aus = await zuschneiden(quelle, f.verhaeltnis ?? img.naturalWidth / img.naturalHeight);
    URL.revokeObjectURL(quelle.src);
    if (!aus) return;
    try {
      const blob = await exportiere(quelle, aus, f.maxPx ?? 2000);
      const url = await blobZuDataUrl(blob);
      zeigeBild(img, url);
      entwurf.bilder[pfad] = { alt: entwurf.bilder[pfad]?.alt ?? String(f.wert), daten: url };
      img.classList.add('pe-geaendert');
      if (f.altPfad && !String(aktuellerWert(f.altPfad) ?? '').trim() && f.altVorlage) setzeAenderung(f.altPfad, f.altVorlage);
      speichern();
      aktualisiereLeiste();
    } catch (e) {
      console.warn('[pe] Foto umwandeln', e);
      await frage(T.fotoErsetzen, T.fotoKaputt, [{ label: T.ok, wert: 'ok', haupt: true }]);
    }
  };
  dateiWahl.click();
}

async function altBearbeiten(pfad: string, img: HTMLImageElement, f: Feld) {
  schliesseBildFenster(pfad, img);
  const altF = daten.felder[f.altPfad!];
  const feld = el('textarea', { maxlength: String(altF.max ?? 150), rows: '3' });
  feld.value = String(aktuellerWert(f.altPfad!) ?? '');
  const w = await frage(T.fotoBeschreibung, el('p', { class: 'pe-sanft' }, T.fotoBeschreibungHilfe), [
    { label: T.abbrechen, wert: 'nein' },
    { label: T.fotoBeschreibungFertig, wert: 'ja', haupt: true },
  ], el('label', { class: 'pe-feld' }, T.fotoBeschreibung, feld));
  const v = bereinigeText(feld.value, false);
  if (w === 'ja' && v) {
    setzeAenderung(f.altPfad!, v);
    img.alt = v;
  }
  img.focus();
}

function bildZuruecksetzen(pfad: string) {
  const img = knoten.get(pfad) as HTMLImageElement;
  const o = originalBild.get(pfad)!;
  const f = daten.felder[pfad];
  if (o.srcset) img.setAttribute('srcset', o.srcset);
  if (o.sizes) img.setAttribute('sizes', o.sizes);
  img.src = o.src;
  img.alt = o.alt;
  img.classList.remove('pe-geaendert');
  delete entwurf.bilder[pfad];
  if (f.altPfad) delete entwurf.texte[f.altPfad];
  speichern();
  aktualisiereLeiste();
  schliesseBildFenster(pfad, img);
}

// ---------- Seite vorbereiten ----------
function bindeFelder() {
  for (const e of document.querySelectorAll<HTMLElement>('[data-pe]')) {
    const pfad = e.dataset.pe!;
    const f = daten.felder[pfad];
    if (!f) { console.warn('[pe] Feld fehlt im Schema', pfad); continue; }
    knoten.set(pfad, e);
    if (f.typ === 'bild') bindeBild(pfad, e as HTMLImageElement, f);
    else bindeText(pfad, e, f);
  }
  // Links verlassen den Bearbeiten-Modus nicht; Sprungmarken scrollen weiter
  document.addEventListener('click', (ev) => {
    const a = (ev.target as HTMLElement).closest('a');
    if (!a || a.closest('.pe-ui')) return;
    ev.preventDefault();
    const href = a.getAttribute('href') ?? '';
    const m = href.match(/^\/?#(.+)$/);
    if (m) document.getElementById(m[1])?.scrollIntoView({ behavior: 'smooth' });
    else toast(T.linkAus);
  }, true);
}

function ladeEntwurf() {
  const e = lsLesen<Entwurf>('entwurf');
  if (!e) return;
  for (const [pfad, w] of Object.entries(e.texte ?? {})) {
    const f = daten.felder[pfad];
    if (!f || f.typ === 'bild') continue;
    entwurf.texte[pfad] = w;
    const k = knoten.get(pfad);
    if (k) { setzeDom(k, f, w.neu); k.classList.add('pe-geaendert'); }
    const bild = [...Object.entries(daten.felder)].find(([, x]) => x.altPfad === pfad);
    if (bild) (knoten.get(bild[0]) as HTMLImageElement | undefined)?.setAttribute('alt', String(w.neu));
  }
  for (const [pfad, b] of Object.entries(e.bilder ?? {})) {
    const img = knoten.get(pfad) as HTMLImageElement | undefined;
    if (!img || daten.felder[pfad]?.typ !== 'bild') continue;
    entwurf.bilder[pfad] = b;
    zeigeBild(img, b.daten);
    img.classList.add('pe-geaendert');
  }
  aktualisiereLeiste();
}

// ---------- Anmeldung ----------
async function sitzungPruefen(): Promise<boolean> {
  for (;;) {
    try {
      const s = await api<{ angemeldet: boolean; csrf?: string }>('sitzung');
      if (s.angemeldet && s.csrf) setzeCsrf(s.csrf);
      return s.angemeldet;
    } catch (e) {
      await meldeFehler(e);
    }
  }
}

function loginDialog(meldung?: string): Promise<void> {
  return new Promise((res) => {
    const dl = dialog({ abbrechbar: false, label: T.loginTitel });
    const email = el('input', { type: 'email', name: 'email', autocomplete: 'username', required: true, inputmode: 'email', autocapitalize: 'off' });
    const pw = el('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: true });
    const fehlerEl = el('p', { class: 'pe-fehler', role: 'alert' }, meldung ?? '');
    const knopf = el('button', { type: 'submit', class: 'pe-knopf pe-haupt pe-voll' }, T.loginKnopf);
    const form = el('form', { class: 'pe-dialog-inhalt', novalidate: true },
      el('h2', {}, T.loginTitel),
      el('p', { class: 'pe-sanft' }, t('loginText', { site: daten.site })),
      el('label', { class: 'pe-feld' }, T.loginEmail, email),
      el('label', { class: 'pe-feld' }, T.loginPasswort, pw),
      fehlerEl, knopf,
      el('p', { class: 'pe-sanft' }, T.loginVergessen));
    dl.inhalt.replaceWith(form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!email.value.trim() || !pw.value) { fehlerEl.textContent = T.loginFalsch; return; }
      knopf.disabled = true;
      knopf.textContent = T.loginLaeuft;
      try {
        const r = await api<{ csrf: string }>('login', { methode: 'POST', body: { email: email.value, passwort: pw.value } });
        setzeCsrf(r.csrf);
        dl.schliessen();
        res();
      } catch (e) {
        const f = e as ApiFehler;
        fehlerEl.textContent = f.code === 'login_falsch' ? T.loginFalsch
          : f.code === 'zu_viele_versuche' ? t('loginGesperrt', { min: Number(f.daten.warteMinuten ?? 15) })
          : f.code === 'offline' ? T.offline : T.fehlerAllgemein;
        knopf.disabled = false;
        knopf.textContent = T.loginKnopf;
      }
    });
    email.focus();
  });
}

async function abmelden() {
  try { await api('logout', { methode: 'POST', body: {} }); } catch { /* egal */ }
  await loginDialog();
  await pruefeStand();
}

// ---------- Fehler ----------
async function meldeFehler(e: unknown) {
  const code = e instanceof ApiFehler ? e.code : 'unbekannt';
  if (!(e instanceof ApiFehler)) console.error('[pe]', e);
  if (code === 'nicht_angemeldet') return loginDialog(T.loginAbgelaufen);
  await frage(T.veroeffentlichen, code === 'offline' ? T.offline : T.fehlerAllgemein, [{ label: T.ok, wert: 'ok', haupt: true }]);
}

// ---------- Stand prüfen / auf Online warten ----------
async function status(commit: string) {
  for (;;) {
    try {
      return await api<{ head: string; monat: number; deploy: 'fertig' | 'laeuft' | 'fehler' | null }>(`status?commit=${commit}`);
    } catch (e) {
      await meldeFehler(e);
    }
  }
}

async function pruefeStand() {
  const s = await status(daten.commit);
  monat = s.monat;
  if (s.head === daten.commit || lsLesen<boolean>(`kaputt:${s.head}`)) return;
  const live = await onlineCommit();
  if (live === s.head) {
    // Neuer Stand ist schon online, diese Seite ist veraltet: neu laden (Entwurf bleibt)
    let schon = false;
    try { schon = sessionStorage.getItem('pe:neu-geladen') === s.head; sessionStorage.setItem('pe:neu-geladen', s.head); } catch { /* egal */ }
    if (!schon) { neuLaden(); return new Promise<void>(() => {}); }
    return;
  }
  const ok = await warteAufOnline(s.head, false);
  if (ok) neuLaden();
}

/** Wartet, bis «commit» online ist. nachVeroeffentlichen: Erfolgsmeldung statt Warte-Hinweis. */
function warteAufOnline(commit: string, nachVeroeffentlichen: boolean): Promise<boolean> {
  return new Promise((res) => {
    const dl = dialog({ abbrechbar: false, label: nachVeroeffentlichen ? T.erfolg : T.wirdOnlineGestellt });
    const balken = el('span');
    const fortschritt = el('div', { class: 'pe-fortschritt', role: 'progressbar', 'aria-label': T.wirdOnlineGestellt }, balken);
    const titel = el('h2', {}, nachVeroeffentlichen ? T.erfolg : T.wirdOnlineGestellt);
    const kopf = nachVeroeffentlichen ? icon(ICON.haken, 'pe-gross-icon pe-ok') : el('div', { class: 'pe-spinner', 'aria-hidden': 'true' });
    const text = el('p', { class: 'pe-sanft' }, T.wirdOnlineGestelltHilfe);
    const knoepfe = el('div', { class: 'pe-dialog-knoepfe' });
    dl.inhalt.append(kopf, titel, text, fortschritt, knoepfe);
    const start = Date.now();
    let runde = 0;
    let fertig = false;

    const ende = (ok: boolean) => {
      fertig = true;
      clearInterval(tick);
      if (ok) {
        fortschritt.classList.add('pe-fertig');
        balken.style.width = '100%';
        if (!nachVeroeffentlichen) { dl.schliessen(); return res(true); }
        kopf.replaceWith(icon(ICON.haken, 'pe-gross-icon pe-ok'));
        titel.textContent = T.online;
        text.remove();
        knoepfe.append(
          el('a', { href: '/', target: '_blank', rel: 'noopener', class: 'pe-knopf pe-rand' }, T.onlineAnsehen),
          el('button', { type: 'button', class: 'pe-knopf pe-haupt', onclick: neuLaden }, T.weiter),
        );
        (knoepfe.lastElementChild as HTMLElement).focus();
        return;
      }
      lsSchreiben(`kaputt:${commit}`, true);
      kopf.replaceWith(icon(ICON.achtung, 'pe-gross-icon'));
      titel.textContent = T.buildKaputt;
      text.remove();
      fortschritt.remove();
      knoepfe.append(el('button', { type: 'button', class: 'pe-knopf pe-haupt', onclick: () => { dl.schliessen(); res(false); if (nachVeroeffentlichen) neuLaden(); } }, nachVeroeffentlichen ? T.weiter : T.buildKaputtWeiter));
      (knoepfe.lastElementChild as HTMLElement).focus();
    };

    const tick = window.setInterval(async () => {
      if (fertig) return;
      const ms = Date.now() - start;
      balken.style.width = `${Math.min(95, (ms / 60_000) * 85)}%`;
      if (ms > WARTEN_MAX_MS) return ende(false);
      if (++runde % 2) return; // alle ~4 s prüfen
      if ((await onlineCommit()) === commit) return ende(true);
      if (runde % 6 === 0) {
        try {
          const s = await api<{ deploy: string | null }>(`status?commit=${commit}`);
          if (s.deploy === 'fehler') ende(false);
        } catch { /* nächster Versuch */ }
      }
    }, 2000);
  });
}

// ---------- Verwerfen / Veröffentlichen ----------
async function allesVerwerfen() {
  const n = anzahl();
  if (!n) return;
  const w = await frage(T.verwerfen, t('verwerfenFrage', { n }), [{ label: T.abbrechen, wert: 'nein' }, { label: T.verwerfenJa, wert: 'ja', haupt: true }]);
  if (w !== 'ja') return;
  for (const pfad of Object.keys(entwurf.bilder)) bildZuruecksetzen(pfad);
  for (const pfad of Object.keys(entwurf.texte)) feldZuruecksetzen(pfad);
  entwurf = { texte: {}, bilder: {} };
  lsSchreiben('entwurf', null);
  aktualisiereLeiste();
}

async function veroeffentlichen() {
  if (!anzahl()) return;
  (document.activeElement as HTMLElement | null)?.blur?.();
  if (monat >= VIEL_VEROEFFENTLICHT) {
    const w = await frage(T.veroeffentlichen, t('vielVeroeffentlicht', { n: monat }), [{ label: T.spaeter, wert: 'nein' }, { label: T.trotzdem, wert: 'ja', haupt: true }]);
    if (w !== 'ja') return;
  }
  await sende(new Set(), false);
}

async function sende(behalten: Set<string>, csrfNeu: boolean): Promise<void> {
  const dl = dialog({ abbrechbar: false, label: T.sendet });
  dl.inhalt.append(el('div', { class: 'pe-spinner', 'aria-hidden': 'true' }), el('h2', {}, T.sendet));
  const body = {
    aenderungen: Object.entries(entwurf.texte).map(([pfad, w]) => ({ pfad, alt: w.alt, neu: w.neu })),
    bilder: Object.entries(entwurf.bilder).map(([pfad, b]) => ({ pfad, alt: b.alt, daten: b.daten.slice(b.daten.indexOf(',') + 1) })),
    behalten: [...behalten],
  };
  let r: { commit: string; monat?: number; nichtsZuTun?: boolean };
  try {
    r = await api('veroeffentlichen', { methode: 'POST', body });
  } catch (e) {
    dl.schliessen();
    const f = e as ApiFehler;
    if (f.code === 'nicht_angemeldet') { await loginDialog(T.loginAbgelaufen); return sende(behalten, csrfNeu); }
    if (f.code === 'csrf' && !csrfNeu) { await sitzungPruefen(); return sende(behalten, true); }
    if (f.code === 'konflikt') return konflikte(f.daten.konflikte as { pfad: string; label: string; aktuell: unknown }[], behalten);
    if (f.code === 'ungueltig') {
      const label = daten.felder[String(f.daten.pfad)]?.label ?? T.veroeffentlichen;
      await frage(T.veroeffentlichen, t('fehlerUngueltig', { feld: label }), [{ label: T.ok, wert: 'ok', haupt: true }]);
      return;
    }
    return meldeFehler(e);
  }
  dl.schliessen();
  entwurf = { texte: {}, bilder: {} };
  lsSchreiben('entwurf', null);
  aktualisiereLeiste();
  if (r.nichtsZuTun) { toast(T.nichtsZuTun); return; }
  monat = r.monat ?? monat;
  try { sessionStorage.setItem('pe:neu-geladen', r.commit); } catch { /* egal */ }
  await warteAufOnline(r.commit, true);
}

/** Echte Konflikte (gleiches Feld inzwischen anders): pro Feld fragen. */
async function konflikte(liste: { pfad: string; label: string; aktuell: unknown }[], behalten: Set<string>) {
  for (const k of liste) {
    const f = daten.felder[k.pfad];
    const deine = f?.typ === 'bild' ? '(dein neues Foto)' : String(entwurf.texte[k.pfad]?.neu ?? '');
    const neu = f?.typ === 'bild' ? '(ein anderes Foto)' : String(k.aktuell ?? '');
    const w = await frage(T.konfliktTitel, el('p', { class: 'pe-sanft' }, k.label), [
      { label: T.konfliktUebernehmen, wert: 'neu' },
      { label: T.konfliktBehalten, wert: 'meine', haupt: true },
    ], el('div', { class: 'pe-vergleich' }, el('div', {}, el('b', {}, T.konfliktNeu), neu), el('div', {}, el('b', {}, T.konfliktDeine), deine)));
    if (w === 'meine') behalten.add(k.pfad);
    else if (w === 'neu') {
      if (f?.typ === 'bild') { delete entwurf.bilder[k.pfad]; }
      else {
        delete entwurf.texte[k.pfad];
        const e = knoten.get(k.pfad);
        if (e && f) { f.wert = k.aktuell; setzeDom(e, f, k.aktuell); e.classList.remove('pe-geaendert'); }
      }
      speichern();
      aktualisiereLeiste();
    } else return; // Escape: nichts senden, Entwurf bleibt
  }
  if (anzahl()) await sende(behalten, false);
}

// ---------- Start ----------
export async function starte() {
  daten = JSON.parse(document.getElementById('pe-daten')!.textContent!);
  document.documentElement.classList.add('pe-an');
  baueUi();
  bindeFelder();
  ladeEntwurf();
  window.addEventListener('beforeunload', (e) => {
    if (anzahl() && !ohneWarnung) { e.preventDefault(); e.returnValue = T.verlassen; }
  });
  if (!(await sitzungPruefen())) await loginDialog();
  await pruefeStand();
  if (!lsLesen<boolean>('hinweis')) {
    await zeigeHinweis();
    lsSchreiben('hinweis', true);
  }
}
