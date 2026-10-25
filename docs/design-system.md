# Design-System Nova Nails

Live: `/styleguide` (noindex). Screenshots: `docs/screenshots/styleguide-*.png`.

## Abgrenzung zu Nailedbyyme
Nailedbyyme ist weiss/nude mit Serif (Cormorant) und Fotos auf 8 Unterseiten; Nova Nails ist ein One-Pager mit flächigem Blush und Akzent-Pink, runder Comfortaa aus dem Logo und dem Logo-Herz (Herz, Finger, Zweig) als einzigem Motiv statt Fotos.

## Farben
Palette der Inhaberin: `#FF5E8F` (signal), `#EC6A8F` (600), `#ED839F` (500), `#EE9CAE` (400), `#EFADB8` (300), `#F3CFCE` (200, Blush).
Abgeleitet im gleichen Farbton (nur Text/Buttons/Flächen): 50, 100, 700–950, muted. Alle Pinktöne der Inhaberin sind < 3:1 auf Weiss/Blush → nur Flächen und Deko.

| Paar | Kontrast |
|---|---|
| Text `#3D1F28` auf Weiss / Blush | 14.74 / 10.26 |
| Nebentext `#6E4250` auf Weiss / Blush | 8.21 / 5.72 |
| Beere `#A8264F` auf Weiss / Blush | 6.87 / 4.79 |
| Weiss auf Beere (Button) | 6.87 |
| Hover `#8A1D41` auf Blush | 6.27 |

Ganze Skala in `@theme` (`src/styles/global.css`), Tailwind-Klassen `nova-50` … `nova-950`, `signal`, `muted`.

## Farbcode der Kundin (Runde 1, 2026-10-24)
Die Kundin hat die Startseite farbig markiert. Diese drei Farben bestimmen seither Header, Startseite und Footer (Tokens in `@theme`, Klassen `akzent`, `hell`, `zart`; die ganze Skala oben bleibt registriert):

| Token | Hex | Rolle |
|---|---|---|
| `akzent` | `#EC698F` | Logo (Herz + Wortmarke), Text, Navigation, Buttons, Kastenflächen, Footer, Kartenrand, Titel «Gut zu wissen» |
| `hell` | `#F3CFCE` | alle Abschnittsflächen und Header, Titel in Akzent-Kästen, Footer-Text und -Logo |
| `zart` | `#F09CAF` | Text und Links in Akzent-Kästen, Text «Gut zu wissen», Beschreibungen und Labels in Leistungskarten, Trennlinien |

**Kontrast – bewusster Entscheid der Kundin, mit Ramon abgesprochen:** Die Kombinationen erreichen kein WCAG AA und werden trotzdem genau so umgesetzt, nicht «verbessert».

| Paar | Kontrast |
|---|---|
| Akzent auf Hell | 2.09 |
| Akzent auf Weiss (Karten, Pille) | 3.01 |
| Zart auf Weiss (Karten) | 2.08 |
| Zart auf Hell (Text Gut zu wissen) | 1.45 |
| Hell auf Akzent (Kastentitel, Buttons, Footer) | 2.09 |
| Zart auf Akzent (Kastentexte und -links) | 1.44 |
| Fokusring `nova-950` auf Akzent / Hell | 4.90 / 10.26 |

Alles andere an Barrierefreiheit bleibt Pflicht: Fokusring 3 px `nova-950` auf allen Flächen sichtbar, Semantik, Alt-Texte, Tastatur. Lighthouse Barrierefreiheit darum 95–96 statt 100 (nur Befund `color-contrast`).

## Schriften
- Titel: **Comfortaa** (Logo-Schrift), selbst gehostet, latin, preload
- Text: **Figtree** – ruhige geometrische Sans, offene Formen, passt zu den runden Titeln, sehr gut lesbar, klar anders als DM Sans. Selbst gehostet, latin, preload

## Komponenten
- Button primär: Fläche Akzent, Text Hell; Hover Akzent mit 12 % Beere gemischt (`color-mix`), bleibt in der Palette
- Button sekundär: transparent, Rand und Text Akzent; Hover Fläche Akzent, Text Hell
- Button «hell» (auf Akzent-Kästen, Anfahrt): Fläche Hell, Text Akzent, Rand Zart; Hover Fläche Weiss
- Alle Buttons Pill-Form, min. 48 px hoch
- Leistungskarte: weiss, Rand 2 px Akzent, Titel und Werte Akzent, Beschreibung und Labels Zart, Radius 24 px, kein Schatten. Preis als Spanne möglich (`preisVon`/`preisBis` → «CHF 60–90»)
- Kästen Aufpreis/Hinweise, Fakten Über mich, Anfahrt (seit Runde 2): Fläche Akzent, Titel Hell, Text und Links Zart; Link-Hover Weiss. Preisphase-Kasten unverändert (Titel und Text Hell)
- Gut zu wissen: Titel Akzent, Text Zart, Trennlinien Zart
- Logo (seit Runde 2): Herz und Wortmarke überall Akzent (Header, 404, Styleguide, Favicon, Apple-Touch-Icon, OG-Bild); einzige Ausnahme Footer (Fläche Akzent): Hell. `Logo.astro` hat nur noch `tone="akzent"` (Standard) und `tone="hell"`
- Header (seit Runde 2, alle Grössen): 3-Spalten-Grid `1fr auto 1fr`; links Burger (Rand/Icon Akzent), Mitte Logo exakt zentriert, rechts «Termin buchen». Menü klappt linksbündig unter dem Burger auf (Fläche Hell, Rand Zart, Links Akzent), schliesst bei Link-Klick, Escape (Fokus zurück auf Burger) und Klick ausserhalb. Unter 480 px: Seitenrand 12 px, Button kleiner und zweizeilig, Logo kleiner
- Footer: Fläche Akzent, alles Hell
- Hero: eine Spalte, Text links (Herz-Grafik auf Wunsch der Kundin entfernt); Herz-Linie darunter in Runde 2 entfernt (Komponente `SignatureLine` gelöscht)
- Leistungskarte: optional Link «Diese Leistung buchen» (nur mit `booking.url` + Slug in `booking.events`)
