// Strukturierte Daten NailSalon – nur bestätigte Felder
import { site } from './site';
import preise from '../../content/preise.json';

export function nailSalonSchema(siteUrl: URL | undefined) {
  const base = siteUrl?.href.replace(/\/$/, '') ?? '';
  const betraege = preise.leistungen
    .flatMap((l) => [l.preisVon, l.preisBis])
    .filter((p): p is number => p != null);
  return {
    '@context': 'https://schema.org',
    '@type': 'NailSalon',
    name: site.name,
    url: base,
    image: `${base}/og.png`,
    logo: `${base}/icon-512.png`,
    telephone: site.telefon.e164,
    ...(site.email ? { email: site.email } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.adresse.strasse,
      postalCode: site.adresse.plz,
      addressLocality: site.adresse.ort,
      addressRegion: site.adresse.kanton,
      addressCountry: 'CH',
    },
    openingHoursSpecification: site.zeiten.schema.map((z) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: z.tage,
      opens: z.von,
      closes: z.bis,
    })),
    priceRange: `CHF ${Math.min(...betraege)}–${Math.max(...betraege)}`,
    currenciesAccepted: 'CHF',
    paymentAccepted: 'Bargeld, TWINT',
    founder: { '@type': 'Person', name: site.inhaberin },
    ...(site.social.instagram || site.social.tiktok
      ? { sameAs: [site.social.instagram, site.social.tiktok].filter(Boolean) }
      : {}),
  };
}
