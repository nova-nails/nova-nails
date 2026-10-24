# Status

## Runde 1 Anpassungen Kundin (2026-10-24)
Quelle: markierte iPad-Screenshots von Julia Tellenbach (Vault `10-Projekte/nova-nails/anpassungen-2026-10-24/`, Bilder 1–5), Masterprompt `nova-nails-anpassungen-1-masterprompt.md`. Abgleich Punkt für Punkt mit `docs/screenshots/startseite-mobil.png` und `startseite-desktop.png`.

### Checkliste
- [x] 1. Tokens `akzent` `#EC698F`, `hell` `#F3CFCE`, `zart` `#F09CAF` in `@theme` (Skala bleibt); Fokusring `nova-950`
- [x] 2. Header: Fläche Hell deckend, Wortmarke + Links Akzent, Herz unverändert, «Termin buchen» Akzent/Hell; Mobilmenü Burger Akzent, Menü Hell, Links Akzent
- [x] 3. Hero: Pille Weiss/Akzent mit Punkt Hell, alle Texte + Ort-Icon Akzent, Buttons Akzent/Hell bzw. Outline Akzent; Herz-Grafik entfernt, eine Spalte, Text links, grössere Schrift und Abstände auf Desktop
- [x] 4. Herz-Linie unter Hero auf Hell (volle Breite); Linie vor «Anfahrt» entfernt
- [x] 5. Leistungen: Fläche Hell, Kopf Akzent; Preisphase-Box Akzent mit Text Hell, Deko-Herz Zart; Karten weiss, Rand 2 px Akzent, Titel/Werte Akzent, Beschreibung/Labels Zart; Inhalte neu (Gelnägel «Form, Länge und Design», «Auffüllen Gelnägel», Nagelverstärkung + Shellac zusammengelegt: 30 Min.–1 Std., CHF 60–90, Entfernen «Gelnägeln», Nail-Art entfernt); Aufpreis/Hinweise-Box Akzent, Titel Zart, Text Hell
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
- **Hero-Text und SEO-Beschreibung** erwähnen weiterhin «Shellac» (nicht markiert, bleibt wörtlich). Rückfrage an Julia in `docs/todo-inhaberin.md`.
- **Abschnittsabstände:** Leistungen, Über mich, Gut zu wissen und Anfahrt sind jetzt alle Hell und gehen ohne Farbwechsel ineinander über; Abstände unverändert gelassen.

### Offen
- Rückfrage «Shellac» im Hero-/SEO-Text (Julia)
- Test auf echtem iPad/Handy nach Deploy
