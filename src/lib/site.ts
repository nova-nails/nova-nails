import site from '../../content/site.json';

export type Preisphase = 'ausbildung' | 'regulaer';

const phase = site.schalter.preisphase;
if (phase !== 'ausbildung' && phase !== 'regulaer') {
  throw new Error(`content/site.json: schalter.preisphase muss "ausbildung" oder "regulaer" sein, nicht "${phase}".`);
}

export { site };
export const preisphase = phase as Preisphase;

export const telHref = `tel:${site.telefon.e164}`;
export const whatsappHref = `https://wa.me/${site.whatsapp.nummer}?text=${encodeURIComponent(site.whatsapp.text)}`;

/** Ziel von «Termin buchen»: Buchungstool, sonst WhatsApp (Fallback). */
export const booking = site.booking.url
  ? { href: site.booking.url, extern: true, viaTool: true }
  : { href: whatsappHref, extern: true, viaTool: false };

export const adresseEinzeilig = `${site.adresse.strasse}, ${site.adresse.plz} ${site.adresse.ort}`;
const q = encodeURIComponent(`${site.name}, ${adresseEinzeilig}`);
export const mapsGoogle = `https://www.google.com/maps/search/?api=1&query=${q}`;
export const mapsApple = `https://maps.apple.com/?q=${q}`;

export const socials = [
  { name: 'Instagram', url: site.social.instagram },
  { name: 'TikTok', url: site.social.tiktok },
].filter((s) => s.url);

/** «CHF 120» oder als Spanne «CHF 60–90». */
export const chf = (von: number, bis?: number | null) => (bis != null ? `CHF ${von}–${bis}` : `CHF ${von}`);

/**
 * Pfad ohne .html und ohne Schrägstrich am Ende.
 * Nötig, weil Astro.url.pathname mit build.format 'file' beim Build «.html» enthält.
 */
export function pagePath(pathname: string): string {
  let p = pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (p.length > 1) p = p.replace(/\/$/, '');
  return p || '/';
}
