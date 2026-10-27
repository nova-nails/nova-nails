// Bearbeiten-Modus: welche Stellen Julia ändern darf. Alles andere (Name, Adresse, Telefon, SEO, Schalter) bleibt bei Ramon.
// Limits aus der Gestaltung abgeleitet und mit `npm run pe:limits` bei 390 und 1280 px geprüft.
import type { PeConfig } from './peter-und-co-editor/core/schema.ts';

const config: PeConfig = {
  site: 'Nova Nails',
  autorin: 'Julia',
  contentDir: 'content',
  felder: {
    // Hero
    'site.json#eroeffnung': { typ: 'text', label: 'Eröffnung', max: 30 },
    'site.json#hero.titel': { typ: 'text', label: 'Hero-Titel', max: 80 },
    'site.json#hero.text': { typ: 'text', label: 'Hero-Text', max: 220 },

    // Leistungen
    'texte.json#leistungen.eyebrow': { typ: 'text', label: 'Leistungen: kleine Überschrift', max: 30 },
    'texte.json#leistungen.titel': { typ: 'text', label: 'Leistungen: Titel', max: 50 },
    'texte.json#leistungen.intro': { typ: 'text', label: 'Leistungen: Einleitung', max: 200 },
    'texte.json#preisphase.eyebrow': { typ: 'text', label: 'Ausbildung: kleine Überschrift', max: 40 },
    'preise.json#ausbildung.titel': { typ: 'text', label: 'Ausbildung: Titel', max: 60 },
    'preise.json#ausbildung.text': { typ: 'text', label: 'Ausbildung: Text', max: 240 },
    'preise.json#leistungen.*.name': { typ: 'text', label: 'Leistung', max: 40 },
    'preise.json#leistungen.*.beschreibung': { typ: 'text', label: 'Beschreibung', max: 180, bezug: 'name' },
    'preise.json#leistungen.*.dauer': { typ: 'text', label: 'Dauer', max: 16, bezug: 'name' },
    'preise.json#leistungen.*.preisVon': { typ: 'zahl', label: 'Preis', max: 999, bezug: 'name' },
    'preise.json#leistungen.*.preisBis': { typ: 'zahl', label: 'Preis bis', max: 999, bezug: 'name', optional: true },
    'texte.json#leistungen.aufpreisTitel': { typ: 'text', label: 'Aufpreis: Titel', max: 30 },
    'preise.json#aufpreise.*.name': { typ: 'text', label: 'Aufpreis', max: 50 },
    'preise.json#aufpreise.*.preis': { typ: 'zahl', label: 'Aufpreis', max: 999, bezug: 'name' },
    'texte.json#leistungen.hinweiseTitel': { typ: 'text', label: 'Hinweise: Titel', max: 30 },
    'preise.json#hinweise.*': { typ: 'text', label: 'Hinweis', max: 120 },

    // Über mich
    'ueber.json#titel': { typ: 'text', label: 'Über mich: Titel', max: 30 },
    'ueber.json#absaetze.*': { typ: 'mehrzeilig', label: 'Über mich: Absatz', max: 600 },
    'ueber.json#fakten.*.titel': { typ: 'text', label: 'Über mich: Kasten-Titel', max: 40 },
    'ueber.json#fakten.*.text': { typ: 'text', label: 'Über mich: Kasten-Text', max: 240, bezug: 'titel' },
    'ueber.json#bild': {
      typ: 'bild', label: 'Porträt', ordner: 'src/assets/julia', verhaeltnis: 444 / 495, maxPx: 1200,
      altFeld: 'bildAlt', altVorlage: 'Julia Tellenbach, Inhaberin von Nova Nails',
    },
    'ueber.json#bildAlt': { typ: 'text', label: 'Porträt: Beschreibung', max: 150 },

    // Gut zu wissen
    'texte.json#gutZuWissen.eyebrow': { typ: 'text', label: 'Gut zu wissen: kleine Überschrift', max: 30 },
    'faq.json#titel': { typ: 'text', label: 'Gut zu wissen: Titel', max: 40 },
    'faq.json#punkte.*.titel': { typ: 'text', label: 'Gut zu wissen: Stichwort', max: 30 },
    'faq.json#punkte.*.text': { typ: 'text', label: 'Gut zu wissen', max: 240, bezug: 'titel' },

    // Galerie (nur sichtbar mit schalter.showGallery)
    'texte.json#galerie.eyebrow': { typ: 'text', label: 'Galerie: kleine Überschrift', max: 30, optional: true },
    'texte.json#galerie.titel': { typ: 'text', label: 'Galerie: Titel', max: 50, optional: true },
    'galerie.json#fotos.*.datei': {
      typ: 'bild', label: 'Galerie-Foto', ordner: 'src/assets/galerie', verhaeltnis: 1, maxPx: 2000,
      altFeld: 'alt', altVorlage: 'Nagel-Design von Nova Nails', optional: true,
    },
    'galerie.json#fotos.*.alt': { typ: 'text', label: 'Galerie-Foto: Beschreibung', max: 150, optional: true },

    // Termin buchen (nur mit booking.url)
    'texte.json#buchen.eyebrow': { typ: 'text', label: 'Buchen: kleine Überschrift', max: 30, optional: true },
    'texte.json#buchen.titel': { typ: 'text', label: 'Buchen: Titel', max: 50, optional: true },
    'texte.json#buchen.intro': { typ: 'text', label: 'Buchen: Einleitung', max: 200, optional: true },

    // Anfahrt
    'texte.json#anfahrt.eyebrow': { typ: 'text', label: 'Anfahrt: kleine Überschrift', max: 30 },
    'texte.json#anfahrt.titel': { typ: 'text', label: 'Anfahrt: Titel', max: 50 },
    'site.json#anreise.*': { typ: 'text', label: 'Anreise', max: 80 },
    'site.json#zeiten.text': { typ: 'text', label: 'Öffnungszeiten', max: 60 },
    'site.json#zeiten.hinweis': { typ: 'text', label: 'Öffnungszeiten: Hinweis', max: 60 },
    'site.json#antwortzeit': { typ: 'text', label: 'Antwortzeit', max: 120 },
  },
};

export default config;
