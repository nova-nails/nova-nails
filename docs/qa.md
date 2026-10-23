# Qualität (Stand 2026-10-23, Build lokal)

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
