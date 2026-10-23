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

## Schriften
- Titel: **Comfortaa** (Logo-Schrift), selbst gehostet, latin, preload
- Text: **Figtree** – ruhige geometrische Sans, offene Formen, passt zu den runden Titeln, sehr gut lesbar, klar anders als DM Sans. Selbst gehostet, latin, preload

## Komponenten
- Button primär (Beere) / sekundär (Outline), Pill-Form, min. 48 px hoch
- Leistungskarte: weiss, Rand nova-300, Radius 24 px, kein Schatten
- Hinweisbox Preisphase: Beere-Fläche mit Herz-Linie (nur in Phase «ausbildung»)
- Linien-Signature: durchgehende Linie mit Herzschlaufe zwischen Abschnitten, beim Scrollen gezeichnet (`pathLength="1"`, ohne `non-scaling-stroke`), bei `prefers-reduced-motion` sofort sichtbar
