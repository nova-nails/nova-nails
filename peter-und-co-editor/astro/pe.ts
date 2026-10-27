// data-pe-Attribute nur auf der Bearbeiten-Seite. Die öffentliche Seite bekommt exakt das bisherige HTML.

export const PE_SEITE = '/bearbeiten';

export function peAktiv(url: URL): boolean {
  return url.pathname.replace(/\.html$/, '').replace(/\/$/, '') === PE_SEITE;
}

/** In einer Komponente: const pe = peFuer(Astro.url); <p data-pe={pe('site.json#hero.titel')}> (undefined → kein Attribut) */
export function peFuer(url: URL) {
  const aktiv = peAktiv(url);
  return (pfad: string | null | undefined): string | undefined => (aktiv && pfad ? pfad : undefined);
}
