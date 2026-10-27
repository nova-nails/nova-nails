# Deployment und Übergabe – Nova Nails

Grundsatz: Alle Konten gehören Julia Tellenbach. Peter & Co wird nur eingeladen. Keine kostenpflichtigen Dienste.

## 1. GitHub
1. Julia legt ein GitHub-Konto an (Gratis, ihre E-Mail-Adresse).
2. Repo `raxmon04/nova-nails` an sie übertragen: GitHub → Settings → Danger Zone → Transfer ownership → ihr Benutzername. Repo bleibt privat.
3. Julia lädt `raxmon04` als Collaborator (Write) ein.
4. Lokal Remote anpassen: `git remote set-url origin https://github.com/<julia>/nova-nails.git`
5. Bearbeiten-Modus: neuen Fine-grained Token für das übertragene Repo erstellen, `PE_GITHUB_TOKEN` (und `PE_GITHUB_REPO`) in Netlify ersetzen, alten Token löschen (`docs/bearbeiten-modus.md`).

## 2. Netlify
1. Julia legt ein Netlify-Konto an (Free, Login mit GitHub).
2. «Add new site» → «Import from Git» → GitHub → `nova-nails`. Build-Einstellungen kommen aus `netlify.toml` (`npm run build`, `dist`, Node 24).
3. Peter & Co als Team-Mitglied einladen (Free-Plan: nur falls verfügbar, sonst Deploy über GitHub-Push).
4. Umgebungsvariablen nur für den Bearbeiten-Modus (`PE_*`, Scope Functions), Einrichtung und Benachrichtigung bei Bau-Fehlern: `docs/bearbeiten-modus.md`.

## 3. Domain
1. Verfügbarkeit prüfen: `novanails.ch`, Alternative `nova-nails.ch` (z. B. bei Infomaniak oder Hostpoint, ca. CHF 10–20/Jahr).
2. Auf Julias Namen und Adresse registrieren.
3. In Netlify: Domain management → Add domain → DNS beim Registrar setzen (A-Record bzw. CNAME `www` laut Netlify-Anleitung). HTTPS aktiviert Netlify automatisch.
4. Falls die Domain nicht `www.novanails.ch` ist: `site` in `astro.config.mjs` anpassen (Canonical, Sitemap, OG-Bild).
5. Optional E-Mail-Adresse über den Registrar (z. B. `hallo@novanails.ch`) → in `content/site.json` bei `email` eintragen.

## 4. Online-Buchung (Cal.com)
Empfehlung: **Cal.com Free** auf Julias Konto, Region **EU**. Einrichtung Schritt für Schritt (Konto, Verfügbarkeit, Event-Typen, Buchungsfragen, Link eintragen): **`docs/cal-com-einrichtung.md`**.

Sobald `booking.url` in `content/site.json` gesetzt ist, erscheint auf der Startseite die Sektion «Termin buchen» mit dem Cal.com-Kalender (Inline-Embed, lädt beim Hinscrollen), alle «Termin buchen»-Buttons (Header, Hero, Anfahrt, 404) springen dorthin und die Datenschutzerklärung zeigt den Cal.com-Abschnitt automatisch. Optional `booking.events` für Direktlinks je Leistung. Leer = Buttons führen zu WhatsApp.

Alternativen geprüft: SimplyBook.me (Free bis 50 Buchungen/Monat, aber Branding und Werbung), Calendly (Free nur 1 Event-Typ, USA). Keine ist besser als Cal.com Free mit EU-Region.

Solange `booking.url` leer ist: «Termin buchen» öffnet WhatsApp mit vorausgefülltem Text, daneben «Anrufen».

## 5. Vor dem Livegang
- `docs/todo-inhaberin.md` abarbeiten
- Logo-SVG ersetzen, sobald Original aus Canva da ist (`brand/`, dann `npm run assets` anpassen)
- Datenschutzerklärung: Netlify-Angaben (Adresse, Garantien USA) vor Livegang kurz prüfen
- Abschluss-Checkliste im Vault: `10-Projekte/nova-nails/website-abschluss.md`

## 6. Schalter (alle in `content/site.json`)
| Schalter | Wirkung |
|---|---|
| `schalter.preisphase` | `"ausbildung"` = Hinweis «Zahl, was es dir wert ist» + reguläre Preise; `"regulaer"` = nur Preisliste |
| `schalter.showOpeningBanner` | Hinweis «Eröffnung November 2026» im Hero und in der Meta-Beschreibung |
| `schalter.showGallery` | Galerie ein/aus (nur Fotos mit `freigegeben: true` aus `content/galerie.json`) |
| `booking.url` | Buchungslink; leer = WhatsApp-Fallback |
| `booking.events` | Cal.com-Slug je Leistung; leer = kein Direktlink auf der Leistungskarte |
| `social.instagram`, `social.tiktok` | Links; leer = ausgeblendet |
| `kursabschluss` | Datum; Preis-Label «Preis ab …» statt «Preis nach Ausbildung» |
