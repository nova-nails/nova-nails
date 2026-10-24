# Design-System Nova Nails

Live: `/styleguide` (noindex). Screenshots: `docs/screenshots/styleguide-*.png`.

## Abgrenzung zu Nailedbyyme
Nailedbyyme ist weiss/nude mit Serif (Cormorant) und Fotos auf 8 Unterseiten; Nova Nails ist ein One-Pager mit flächigem Blush und Beere, runder Comfortaa aus dem Logo und der Logo-Linie (Herz, Finger, Zweig) als einzigem Motiv statt Fotos.

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
| `akzent` | `#EC698F` | Text, Navigation, Wortmarke, Buttons, Kastenflächen, Footer, Kartenrand |
| `hell` | `#F3CFCE` | alle Abschnittsflächen und Header, Text auf Akzent |
| `zart` | `#F09CAF` | Titel in Kästen, Beschreibungen und Labels in Leistungskarten, Trennlinien |

**Kontrast – bewusster Entscheid der Kundin, mit Ramon abgesprochen:** Die Kombinationen erreichen kein WCAG AA und werden trotzdem genau so umgesetzt, nicht «verbessert».

| Paar | Kontrast |
|---|---|
| Akzent auf Hell | 2.09 |
| Akzent auf Weiss (Karten, Pille) | 3.01 |
| Zart auf Weiss (Karten) | 2.08 |
| Zart auf Hell (Gut zu wissen) | 1.45 |
| Hell auf Akzent (Kästen, Buttons, Footer) | 2.09 |
| Zart auf Akzent (Kastentitel) | 1.44 |
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
- Kästen (Preisphase, Aufpreis/Hinweise, Fakten Über mich, Anfahrt): Fläche Akzent, Titel Zart (Preisphase: Hell), Text Hell
- Header: Fläche Hell (deckend), Wortmarke und Links Akzent, Herz Beere; Mobilmenü Fläche Hell, Rand Zart
- Footer: Fläche Akzent, alles Hell
- Linien-Signature: nur noch unter dem Hero (Fläche Hell), beim Scrollen gezeichnet (`pathLength="1"`, ohne `non-scaling-stroke`), bei `prefers-reduced-motion` sofort sichtbar
- Hero: eine Spalte, Text links (Herz-Grafik auf Wunsch der Kundin entfernt)
