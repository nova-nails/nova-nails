# Qualität

## Runde 2 Anpassungen (Stand 2026-10-25, Build lokal, Lighthouse aktuell via npx)

| Prüfung | Ergebnis |
|---|---|
| Lighthouse mobil `/` | Performance 100, Barrierefreiheit 96, Best Practices 100, SEO 100, CLS 0 |
| Lighthouse desktop `/` | 100 / 96 / 100 / 100, CLS 0 |
| Barrierefreiheit | einziger Befund `color-contrast` (gewollter Farbcode der Kundin) |
| Header 320 / 375 / 390 / 1280 px | Burger, Logo, Button überlappen nicht; Logo-Mitte = Seitenmitte; keine horizontale Scrollbar (Playwright gemessen) |
| Tastatur Burger | Tab erreicht Burger, Enter öffnet, Tab auf ersten Link, Fokusring 3 px sichtbar, Escape schliesst und fokussiert Burger; Klick ausserhalb und Link-Klick schliessen |
| Buchung | Test-URL: alle «Termin buchen» (Header, Hero, Anfahrt, 404) und Direktlink umgeschaltet, Datenschutz-Abschnitt erscheint; Push mit leerer `booking.url` |
| `grep -ri shellac` | keine Treffer in `src/`, `content/`, `dist/` |

## Runde 1 Anpassungen (Stand 2026-10-24, Build lokal, Lighthouse 12.8)

| Prüfung | Ergebnis |
|---|---|
| Lighthouse mobil `/` | Performance 100, Barrierefreiheit 96, Best Practices 100, SEO 100, CLS 0 |
| Lighthouse desktop `/` | 100 / 96 / 100 / 100, CLS 0 |
| Lighthouse mobil / desktop `/impressum` | 100 / 95 / 100 / 100, CLS 0 |
| Barrierefreiheit | einziger Befund `color-contrast` (gewollter Farbcode der Kundin, siehe `docs/design-system.md`); keine weiteren axe-Befunde |
| Tastatur | Fokusring 3 px `nova-950` auf Hell, Weiss und Akzent sichtbar; Mobilmenü: Enter öffnet, Tab in Links, Escape schliesst und fokussiert den Menü-Button |

## Erstabnahme (Stand 2026-10-23, Build lokal)

| Prüfung | Ergebnis |
|---|---|
| Lighthouse mobil (/, /impressum, /datenschutz) | 100 / 100 / 100 / 100, CLS 0 |
| Lighthouse desktop (dieselben Seiten) | 100 / 100 / 100 / 100, CLS 0 |
| axe-core (WCAG 2.1 A/AA + best practice), 390 px und 1280 px, alle Seiten inkl. 404 und Styleguide | 0 Verstösse |
| Tastatur | Skip-Link, Navigation, Menü (Enter öffnet, Escape schliesst), alle Links mit 3 px Fokusring |
| Schalter | preisphase, showOpeningBanner, showGallery, social, booking.url per Build getestet |
| Galerie | Foto ohne Alt-Text → Build bricht mit Fehlermeldung ab |

Handy-Test im WLAN:

```bash
npm run dev -- --host
```

Dann auf dem Handy `http://<Mac-IP>:4324` öffnen (Mac-IP: `ipconfig getifaddr en0`).
Geprüft wurde bisher per Emulation (390 px). Test auf echtem Gerät: offen.
