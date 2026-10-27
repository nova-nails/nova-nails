// Kleine DOM-Helfer: Elemente, Dialoge (native <dialog>), Hinweis-Blase.

type Kind = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kinder: Kind[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else if (k in e && typeof v !== 'string') (e as unknown as Record<string, unknown>)[k] = v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kinder) if (c) e.append(c);
  return e;
}

export const ICON = {
  stift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
  haken: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  achtung: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 8v5"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/><circle cx="12" cy="12" r="9"/></svg>',
  mehr: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
};

export function icon(svg: string, klasse = ''): HTMLElement {
  const s = el('span', { class: klasse });
  s.innerHTML = svg;
  return s;
}

export interface Dialog {
  d: HTMLDialogElement;
  inhalt: HTMLElement;
  schliessen(): void;
}

/** Modaler Dialog. abbrechbar=false: Escape schliesst nicht (z. B. Anmeldung). */
export function dialog(opt: { abbrechbar?: boolean; klasse?: string; label: string }): Dialog {
  const inhalt = el('div', { class: 'pe-dialog-inhalt' });
  const d = el('dialog', { class: `pe-ui pe-dialog ${opt.klasse ?? ''}`, 'aria-label': opt.label }, inhalt);
  d.addEventListener('cancel', (e) => { if (opt.abbrechbar === false) e.preventDefault(); });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  return { d, inhalt, schliessen: () => d.open && d.close() };
}

/** Frage mit Knöpfen; liefert den Wert des gewählten Knopfs (Escape = null). */
export function frage(titel: string, text: Kind, knoepfe: { label: string; wert: string; haupt?: boolean }[], inhaltExtra?: Node): Promise<string | null> {
  return new Promise((res) => {
    const dl = dialog({ label: titel });
    let wert: string | null = null;
    const teile: Kind[] = [
      el('h2', {}, titel),
      typeof text === 'string' ? el('p', {}, text) : text,
      inhaltExtra,
      el('div', { class: 'pe-dialog-knoepfe' }, ...knoepfe.map((k) => el('button', { type: 'button', class: `pe-knopf ${k.haupt ? 'pe-haupt' : 'pe-rand'}`, onclick: () => { wert = k.wert; dl.schliessen(); } }, k.label))),
    ];
    dl.inhalt.append(...teile.filter((x): x is Node | string => !!x));
    dl.d.addEventListener('close', () => res(wert));
    (dl.inhalt.querySelector('.pe-haupt') as HTMLElement | null)?.focus();
  });
}

let toastTimer = 0;
export function toast(text: string, ms = 4200) {
  document.querySelector('.pe-toast')?.remove();
  const t = el('div', { class: 'pe-ui pe-toast', role: 'status' }, text);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), ms);
}
