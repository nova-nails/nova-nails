# Status

## Runde 1 Anpassungen Kundin (2026-10-24)
Quelle: markierte iPad-Screenshots von Julia Tellenbach (Vault `10-Projekte/nova-nails/anpassungen-2026-10-24/`, Bilder 1–5), Masterprompt `nova-nails-anpassungen-1-masterprompt.md`. Abgleich Punkt für Punkt mit `docs/screenshots/startseite-mobil.png` und `startseite-desktop.png`.

### Checkliste
- [x] 1. Tokens `akzent` `#EC698F`, `hell` `#F3CFCE`, `zart` `#F09CAF` in `@theme` (Skala bleibt); Fokusring `nova-950`
- [x] 2. Header: Fläche Hell deckend, Wortmarke + Links Akzent, Herz unverändert, «Termin buchen» Akzent/Hell; Mobilmenü Burger Akzent, Menü Hell, Links Akzent
- [x] 3. Hero: Pille Weiss/Akzent mit Punkt Hell, alle Texte + Ort-Icon Akzent, Buttons Akzent/Hell bzw. Outline Akzent; Herz-Grafik entfernt, eine Spalte, Text links, grössere Schrift und Abstände auf Desktop
- [x] 4. Herz-Linie unter Hero auf Hell (volle Breite); Linie vor «Anfahrt» entfernt
- [x] 5. Leistungen: Fläche Hell, Kopf Akzent; Preisphase-Box Akzent mit Text Hell, Deko-Herz Zart; Karten weiss, Rand 2 px Akzent, Titel/Werte Akzent, Beschreibung/Labels Zart; Inhalte neu (Gelnägel «Form, Länge und Design», «Auffüllen Gelnägel», Nagelverstärkung + Gel-Lack-Karte zusammengelegt: 30 Min.–1 Std., CHF 60–90, Entfernen «Gelnägeln», Nail-Art entfernt); Aufpreis/Hinweise-Box Akzent, Titel Zart, Text Hell
- [x] 6. Meine Lieblingsstile: Abschnitt, Komponente und JSON gelöscht
- [x] 7. Über mich: Kopf und Absätze Akzent, Herz am Schluss entfernt, Fakten-Kästen Akzent/Zart/Hell
- [x] 8. Gut zu wissen: Fläche Hell, Kopf Akzent, Punkt-Titel Zart, Texte Akzent, Trennlinien Zart; Bezahlung «Kartenzahlung ist noch nicht möglich.»
- [x] 9. Anfahrt: Kopf Akzent, drei Kästen Akzent mit Titel Zart und allen Texten/Links Hell; «Termin buchen» Hell/Akzent mit Rand Zart
- [x] 10. Footer: Fläche Akzent, alle Texte/Links + Herz Hell, Trennlinie Hell 50 %
- [x] Styleguide und `docs/design-system.md` nachgeführt, Kontrast-Entscheid dokumentiert
- [x] Build ohne Fehler, Lighthouse, Tastatur (siehe `docs/qa.md`)

### Entscheide (selbst getroffen)
- **Kontrast:** bewusster Entscheid der Kundin, mit Ramon abgesprochen. Farben exakt wie markiert, nicht «verbessert». Lighthouse Barrierefreiheit 95–96, einziger Befund `color-contrast`.
- **Hover primärer Button:** Akzent mit 12 % Beere (`nova-900`) gemischt, leicht dunkler. Button «hell»: Hover Weiss. Links auf Akzent-Flächen: Hover Weiss.
- **Fokusring:** 3 px `nova-950` überall (4.9:1 auf Akzent, 10.3:1 auf Hell); Footer-Sonderregel entfernt.
- **Header-Unterkante:** Linie `nova-300`, damit der deckende Header beim Scrollen über gleichfarbige Flächen abgegrenzt bleibt.
- **Leistungsraster:** 5 Karten, 2 Spalten (Tablet) bzw. 3 Spalten (Desktop); letzte Karte bleibt links, keine Sonderausrichtung.
- **Datenmodell Preise:** `preisVon`/`preisBis`, `dauerMinVon`/`dauerMinBis` für alle Leistungen; `chf(von, bis)` gibt «CHF 60–90» aus. Schema `priceRange` aus allen Werten (weiterhin CHF 40–120).
- **Cal.com:** Nagelverstärkung als Event-Typ mit 60 Min. (längere Dauer der Spanne), siehe `docs/deployment.md`.
- **Hero-Text und SEO-Beschreibung** blieben in Runde 1 wörtlich; in Runde 2 auf «Gel-Lack» geändert (erledigt).
- **Abschnittsabstände:** Leistungen, Über mich, Gut zu wissen und Anfahrt sind jetzt alle Hell und gehen ohne Farbwechsel ineinander über; Abstände unverändert gelassen.

### Offen
- ~~Rückfrage zum Begriff im Hero-/SEO-Text (Julia)~~ erledigt in Runde 2: «Gel-Lack»
- Test auf echtem iPad/Handy nach Deploy

## Runde 2 Anpassungen Kundin (2026-10-25)
Quelle: Masterprompt `nova-nails-anpassungen-2-masterprompt.md` (Vault `10-Projekte/nova-nails/`).

### Checkliste
- [x] 1. Logo überall Akzent (Header, `Logo.astro` sm/lg, 404, Styleguide, Favicon, Apple-Touch-Icon, `icon-512.png`, OG-Bild); Footer-Logo bleibt Hell; `tone`-Logik vereinfacht
- [x] 2. Header: Burger links (alle Grössen, Menü klappt nach links auf), Logo exakt zentriert, «Termin buchen» rechts; 320–390 px ohne Überlappung; schliesst bei Link-Klick, Escape, Klick ausserhalb
- [x] 3. Hero: Herz-Linie unter dem Hero und `SignatureLine.astro` gelöscht; «Shellac» → «Gel-Lack» in Hero- und SEO-Text; Rückfrage erledigt
- [x] 4. Farben Titel ↔ Text getauscht: Aufpreis/Hinweise, Über-mich-Kästen, Gut zu wissen, Anfahrt-Kästen (inkl. Links)
- [x] 5. Über mich: Eyebrow «Julia Tellenbach» gelöscht
- [x] 6. Online-Buchung vorbereitet (alle Buttons gleiches Ziel, neuer Tab, `booking.events`, Datenschutz-Abschnitt nur mit `booking.url`), Anleitung `docs/cal-com-einrichtung.md`
- [x] Styleguide und `docs/design-system.md` nachgeführt
- [x] Build, `grep -ri shellac`, Screenshots, Header 320 px, Lighthouse, Tastatur (siehe `docs/qa.md`)

Screenshots: `docs/screenshots/startseite-mobil.png` (375 px), `startseite-desktop.png` (1280 px), `header-menu-mobil.png`, `header-menu-desktop.png`, `header-menu-320.png` (Burger offen, Fokus per Tastatur auf erstem Link), `styleguide-*.png`.

### Entscheide (selbst getroffen)
- **Header-Raster:** `grid-cols-[1fr_auto_1fr]`, Logo gemessen exakt in der Seitenmitte (320/375/390/1280 px, Abweichung < 0.1 px). Unter 480 px: Seitenrand 12 px, Logo etwas kleiner (Herz 28 px, Wortmarke 15 px), «Termin buchen» kleiner und zweizeilig («Termin / buchen»); bei 320 px 8 px Luft zwischen Logo und Button, keine horizontale Scrollbar.
- **Burger:** natives `<details>` (Zustand für Screenreader eingebaut), Navigation `aria-label="Hauptnavigation"`. Schliesst bei Link-Klick, Escape (Fokus zurück auf Burger) und Klick ausserhalb.
- **Logo:** `Logo.astro` nur noch `tone="akzent"` (Standard) und `tone="hell"` (Footer-Variante, im Styleguide gezeigt). Untertitel «by Julia Tellenbach» in der grossen Variante ebenfalls Akzent. 404-Herz Akzent. Footer unverändert Hell.
- **Favicon/OG:** Favicon-Herz Akzent auf Blush; OG-Bild aus dem Originallogo, Linie und Schrift per Grünkanal-Maske einheitlich auf `#EC698F` umgefärbt (Kantenglättung bleibt). `brand/logo-original.png` unverändert; `brand/logo-entwurf.svg` wird vom Script erzeugt und ist jetzt ebenfalls Akzent.
- **Link-Hover in Akzent-Kästen (Anfahrt):** Weiss, wie Footer und Runde 1.
- **Preisphase-Kasten** (Titel und Text Hell) nicht in der Tausch-Liste → unverändert.
- **Direktlinks je Leistung:** eingebaut über `booking.events` in `content/site.json` (Schlüssel = Leistungsname aus `preise.json`, Wert = Cal.com-Slug). Link «Diese Leistung buchen» unten in der Karte, nur mit `booking.url` und Slug; mit Test-URL geprüft, kein Layout-Bruch. Slugs bleiben leer, bis die Event-Typen existieren (sonst tote Links); Vorschläge in `docs/cal-com-einrichtung.md`.
- **Datenschutz Cal.com:** Abschnitt war bereits an `booking.url` gekoppelt; ergänzt um Telefon und Notiz als Daten.
- **Test-URL:** `https://cal.com/test` lokal gebaut: Header, Hero, Anfahrt und 404 zeigen alle darauf (neuer Tab, Screenreader «Online-Buchung, öffnet in neuem Tab»), Datenschutz zeigt Cal.com-Abschnitt; danach wieder geleert.

### Offen
- Cal.com-Konto durch Julia (braucht E-Mail-Adresse), dann `booking.url` eintragen (`docs/cal-com-einrichtung.md`)
- Test auf echtem iPad/Handy nach Deploy
