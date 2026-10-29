# Bearbeiten-Modus (Peter & Co Editor)

Julia ändert Texte, Preise und ihr Porträt direkt auf der echten Seite unter **`/bearbeiten`**: antippen, tippen, «Veröffentlichen». Ein Klick ergibt **einen** Commit und damit **einen** Deploy. Ersetzt Keystatic und Tina (Branches am 2026-10-27 gelöscht; Vergleich: Vault `40-Wissen/cms-vergleich-keystatic-tina`).

Stand 2026-10-29: Der Editor liegt auf `main` (Branch `editor` ist gemergt und gelöscht). Lokal und gegen GitHub getestet. **Der Test auf Netlify (Production auf `main`) steht noch aus** (Einrichtung, Schritt 6).

## Aufbau

```
peter-und-co-editor/          wiederverwendbar, nichts Nova-spezifisches
  core/                       hosting-unabhängig (Web-Standard Request → Response, node:crypto)
    api.ts                    Routen /api/pe/*: Login, Sitzung, Status, Veröffentlichen (Validierung, Konflikte, ein Commit)
    schema.ts                 Feld-Schema, Prüfung, Bereinigung (auch im Browser und im Build)
    sitzung.ts                scrypt-Passwort-Hash, HMAC-Sitzungs-Cookie, CSRF
    github.ts                 RepoZugriff über die Git Data API (Blob → Tree → Commit → Ref)
    bild.ts                   Bildprüfung (JPEG/WebP, Masse aus dem Dateikopf)
    speicher.ts               Interface KV (Rate-Limit, Monatszähler) + Arbeitsspeicher-Variante
    deploy.ts                 Interface DeployStatus
    texte.ts                  alle Texte für Julia und Fehlercodes
  adapter/netlify/            einziger Netlify-Teil: Env lesen, Blobs als KV, Netlify-API als DeployStatus
  client/                     Editor im Browser (Vanilla TS, ca. 27 KB JS + 8 KB CSS, nur auf /bearbeiten)
  astro/                      pe()-Helper, PeText, Editor.astro (Daten + Skript)
  build/                      pe.ts (vorbereiten, inhalte, seite, passwort), build-info.ts
  dev/server.ts               lokaler Server (Fake-GitHub mit echten Builds oder echtes GitHub)
netlify/functions/pe-*.ts     dünne Adapter (3 Zeilen), Pfade /api/pe/*
.github/workflows/build-pruefen.yml   baut bei Push auf main/editor wie Netlify, Mail bei Fehler
pe.config.ts                  seitenspezifisch: welche Felder, Limits, Bildformate
content/texte.json            neu: Abschnitts-Titel/Einleitungen, die vorher fest im Code standen
src/pages/bearbeiten.astro    gleiche Startseite (src/components/Startseite.astro) + Editor
src/pages/pe-version.json.ts  welcher Commit gerade online ist
```

**Öffentliche Seiten bleiben byte-identisch** mit `main` (`dist/index.html`, Impressum, Datenschutz, 404, Sitemap, CSS). Deshalb sind auch Lighthouse (100/96/100/100, CLS 0) und axe unverändert. `data-pe` gibt es nur auf `/bearbeiten`: `pe()` liefert dort den Pfad, sonst `undefined`, und Astro lässt das Attribut dann weg. Spread-Attribute (`{...x}`) sind bewusst nicht verwendet, weil Astro sonst Scope-Klassen ins öffentliche HTML schreibt.

## Felder (pe.config.ts)
Änderbar sind alle sichtbaren Texte der Startseite: Hero, Eröffnung, Leistungen (Name, Beschreibung, Dauer, Preise), Aufpreis, Hinweise, Ausbildungs-Kasten, Über mich (Titel, Absätze, Kästen, Porträt + Beschreibung), Gut zu wissen, Anfahrt-Texte und Abschnittstitel. Galerie-Fotos sind vorbereitet (1:1), sobald es Fotos gibt.

**Nicht änderbar** (bleibt bei Ramon): Name, Untertitel, Adresse, Telefon, WhatsApp, E-Mail, SEO, Schalter, Buchung, Impressum und Datenschutz.

Limits sind aus der Gestaltung abgeleitet und mit `npm run pe:limits` geprüft: Jedes Feld wird bis zum Limit gefüllt, bei 390 und 1280 px ragt nichts hinaus. Preise gehen bis höchstens 999, weil «CHF 9999–9999» bei drei Spalten die Karte sprengt.

**Achtung, Leistungsname:** `site.json → booking.events` ordnet Cal.com-Slugs dem Namen zu. Benennt Julia eine Leistung um, fehlt deren Direktlink, bis der Schlüssel dort angepasst ist. Aktuell sind alle Slugs leer, also ohne Folgen.

## Ablauf Veröffentlichen
1. Der Browser sendet `{ pfad, alt, neu }` je Änderung und Fotos als base64 (zugeschnitten, ≤ maxPx, < 1 MB, WebP oder JPEG).
2. Die Function prüft Sitzung, CSRF und Origin. Danach validiert sie **jedes Feld** gegen das Schema: nur bestehende Pfade, kein neuer Eintrag, Typ, Limit, HTML entfernt. Bei Fotos prüft sie Format, Grösse, Pixel und Seitenverhältnis.
3. Sie liest die Dateien am aktuellen Branch-Stand. Steht ein Feld dort noch auf `alt`, wird es übernommen. Ist es inzwischen anders (z. B. Ramon hat gepusht), entsteht ein **Konflikt nur für dieses Feld**, und Julia wird gefragt: «Deine Version behalten?». Andere Änderungen werden einfach zusammengeführt.
4. Alle geänderten Dateien werden nochmals vollständig validiert und dann als **ein Commit** geschrieben, z. B. «Julia: Hero-Titel, Preis (Maniküre), Porträt». Das alte Foto wird im selben Commit gelöscht. Ist der Branch inzwischen weiter (Ref-Update schlägt fehl), versucht sie es automatisch bis zu 3-mal.
5. Der Browser fragt `/pe-version.json` ab, bis der neue Commit online ist, und zeigt dann «Fertig, deine Änderungen sind online!».

Beim Öffnen von `/bearbeiten` vergleicht der Editor den eingebetteten Build-Commit (`COMMIT_REF`) mit dem GitHub-Stand. Läuft noch ein Deploy, sieht Julia «Deine letzte Änderung wird gerade online gestellt …» und kann erst danach weiterarbeiten.

**Build-Sicherheit:** `npm run build` = `pe.ts vorbereiten` (alle `content/*.json` gegen das Schema, Bilddateien vorhanden) → `astro build` → `pe.ts seite` (jedes `data-pe` im Schema und umgekehrt, öffentliche Seiten ohne Editor-Code). Ein Fehler bricht ab, und die alte Seite bleibt online.

## Fehlerfälle (alle einmal ausgelöst, `npm run pe:abnahme`)
| Fall | Julia sieht | Screenshot |
|---|---|---|
| Kein Internet | «Keine Verbindung. Deine Änderungen sind gespeichert, versuch es gleich nochmal.» | `pe-fehler-offline.png` |
| Anmeldung abgelaufen | Anmeldung mit «Bitte melde dich nochmal an. Deine Änderungen sind gespeichert.», danach wird automatisch veröffentlicht | `pe-fehler-abgelaufen.png` |
| Gleichzeitig geändert, gleiches Feld | «Dieses Feld wurde inzwischen geändert. Deine Version behalten?» mit beiden Versionen | `pe-fehler-konflikt.png` |
| Foto unbrauchbar | «Dieses Foto klappt leider nicht. Versuch ein anderes oder mach einen Screenshot davon.» | `pe-fehler-foto.png` |
| Bau schlägt fehl | «Das hat nicht geklappt, Ramon ist informiert. Deine Website bleibt wie vorher online.» | `pe-fehler-bau.png` |
| Veröffentlichung läuft noch | «Deine letzte Änderung wird gerade online gestellt …» | `pe-fehler-laeuft.png` |
| ≥ 15 Veröffentlichungen im Monat | sanfter Hinweis zum Sammeln, «Jetzt veröffentlichen» oder «Später» | `pe-hinweis-sammeln.png` |
| Falsches Passwort / zu viele Versuche | «E-Mail oder Passwort stimmt nicht.» / «Bitte warte 15 Minuten» | `pe-fehler-login.png` |
| Buchstabe im Preis, leeres Feld, zu lang | «Bitte nur eine Zahl, z. B. 40» / «Dieses Feld darf nicht leer sein.» / «Mehr Platz hat es hier nicht.» | `pe-4-preis.png` |

Technische Details stehen nur in der Konsole bzw. im Function-Log. **Bau-Fehler erkennen:** Mit `PE_NETLIFY_TOKEN` sofort über die Netlify-API, sonst nach 10 Minuten Wartezeit. «Ramon ist informiert» stimmt dank der GitHub Action `Build prüfen` (Einrichtung, Schritt 5).

## Einrichtung Netlify (Production auf `main`)
Menünamen Stand Oktober 2026: Netlify sagt jetzt *Project configuration* (früher *Site configuration*) und *Developer settings* (früher *Build & deploy*).

1. **Deploy:** Der Editor läuft direkt auf der Production (`main`). Keine Branch-Deploys nötig.
2. **GitHub-Token:** github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
   - Name z. B. `nova-nails`, Resource owner `raxmon04`, Expiration *Custom* auf 1 Jahr (Termin im Kalender notieren).
   - Repository access: *Only select repositories* → `nova-nails/nova-nails`.
   - Permissions: **Add permissions** → nur **Contents** anhaken → in der Liste von *Read-only* auf **Read and write** stellen. *Metadata: Read-only* kommt automatisch dazu und ist Pflicht. Sonst nichts.
   - Generate token, Token sofort kopieren (wird nur einmal angezeigt) und im Passwortmanager ablegen.
3. **Passwort:** lokal `npm run pe:passwort`. Gefragt ist **Julias Login-Passwort** für `/bearbeiten` (mind. 10 Zeichen, am besten im Passwortmanager generieren und dort mit Julias E-Mail speichern). Die Eingabe bleibt unsichtbar, gespeichert wird nur der Hash. Ausgabe: `PE_PASSWORT_HASH` und `PE_SESSION_SECRET`. Beide Werte nicht in Chats oder Mails kopieren, das Passwort Julia persönlich oder über einen sicheren Weg geben.
4. **Umgebungsvariablen:** Project configuration → Environment variables → Add a variable → Add a single variable.
   - Bei allen Secrets **«Contains secret values»** anhaken. Netlify stellt dann selbst auf *Specific scopes* (Builds, Functions, Runtime; Post processing ist für Secrets gesperrt) und auf *Different value for each deploy context* mit demselben Wert überall um. Das passt so. Dass *Specific scopes* sonst «Upgrade to unlock» zeigt, spielt keine Rolle.
   - Ohne Secret-Haken (nur `PE_EMAIL`): *All scopes* und *Same value for all deploy contexts*.
   - **Local development (Netlify CLI)** leer lassen, lokal läuft alles über `npm run pe:dev`.
   - Die Werte gelten gleich für alle Kontexte, auch Production. Das schadet nicht, solange `main` den Editor-Code noch nicht hat, und Schritt 7 wird einfacher.

| Variable            | Secret | Wert                                                                        |
| ------------------- | ------ | --------------------------------------------------------------------------- |
| `PE_EMAIL`          | nein   | Julias E-Mail (Login)                                                       |
| `PE_PASSWORT_HASH`  | ja     | aus `npm run pe:passwort`                                                   |
| `PE_SESSION_SECRET` | ja     | aus `npm run pe:passwort` (nur einmal setzen; ein Wechsel meldet alle ab)   |
| `PE_GITHUB_TOKEN`   | ja     | Fine-grained Token aus Schritt 2                                            |
| `PE_NETLIFY_TOKEN`  | ja     | empfohlen, siehe unten                                                      |
| `PE_GITHUB_REPO`    | –      | **weglassen**: Netlify liefert das Repo über `REPOSITORY_URL` mit. Nur setzen, wenn das Repo umzieht (z. B. `julia/nova-nails`). |
| `PE_BRANCH`         | –      | **weglassen**: Standard ist der Branch des Deploys, also `main` auf der Live-Seite. |

**`PE_NETLIFY_TOKEN`:** Damit fragt der Editor die Netlify-API nach dem Deploy-Status. Mit Token sieht Julia einen kaputten Bau nach etwa einer Minute, ohne erst nach 10 Minuten Wartezeit. Erstellen: Netlify unten links Avatar → User settings → Applications → Personal access tokens → New access token, Name `nova-nails-editor`, Ablauf 1 Jahr. Achtung: Ein Netlify-Token lässt sich nicht auf ein Projekt beschränken und hat Zugriff aufs ganze Netlify-Konto. Er liegt nur als Secret in den Functions. Wer das nicht will, lässt ihn weg.

5. **Benachrichtigung bei kaputtem Bau:** Die Netlify-Mail «Deploy failed» gibt es nur im Pro-Plan. Ersatz ist die GitHub Action `.github/workflows/build-pruefen.yml`: Sie baut bei jedem Push auf `main` und `editor` mit `npm run build` genau wie Netlify (Änderungen nur an `docs/` oder `*.md` ausgenommen). Schlägt der Build fehl, schickt GitHub eine Mail an den Auslöser. Veröffentlichungen aus dem Editor laufen über den Token aus Schritt 2, Auslöser ist also der Besitzer des Tokens (jetzt Ramon). Einmal prüfen: github.com → Settings → Notifications → **Actions**: «Only notify for failed workflows» und *Email* eingeschaltet. Kosten: ca. 1–2 Minuten pro Build von 2000 Gratis-Minuten pro Monat (private Repos). Manuell starten: Repo → Actions → «Build prüfen» → Run workflow.
6. Neu deployen (Deploys → Trigger deploy), dann `https://www.novanails-studio.ch/bearbeiten` (bzw. die `.netlify.app`-Adresse) öffnen und testen: anmelden, Text, Preis, Foto vom Handy, Veröffentlichen, Konflikt (parallel pushen), Flugmodus, falsches Passwort. Dabei prüfen, ob die Action `Build prüfen` nach Julias Test-Veröffentlichung grün durchläuft.
7. Erst danach `editor` nach `main` mergen. Die Variablen gelten schon für Production (Schritt 4), dort ist nichts mehr zu tun.

**Passwort zurücksetzen:** `npm run pe:passwort` → neuen `PE_PASSWORT_HASH` in Netlify eintragen → neu deployen. Alte Sitzungen werden damit ungültig, weil der Hash im Cookie-Fingerabdruck steckt.

**Token erneuern / Repo an Julia übertragen:** Nach dem Transfer (`docs/deployment.md`) einen neuen Fine-grained Token im **Konto von Julia** (oder als Collaborator mit Zugriff) für das übertragene Repo erstellen, `PE_GITHUB_TOKEN` und `PE_GITHUB_REPO` ersetzen und den alten Token löschen. Die Fehler-Mails der Action gehen immer an den Besitzer des Tokens, mit dem der Editor committet. Soll Ramon sie weiter bekommen, erstellt er den Token als Collaborator selbst.

## Kosten
- Netlify Free: jede Veröffentlichung auf `main` ist ein Production-Deploy (15 von 300 Credits pro Monat, ≈ 20 pro Monat). Ab 15 Veröffentlichungen im Monat zeigt der Editor den Sammel-Hinweis. Der Zähler (Netlify Blobs) zählt nur Veröffentlichungen aus dem Editor, nicht Ramons Pushes.
- Functions und Blobs bleiben weit innerhalb des Free-Plans.
- GitHub Actions (`Build prüfen`): ca. 1–2 Minuten pro Push, weit unter den 2000 Gratis-Minuten pro Monat.

## Hosting wechseln (geplant: Cloudflare; alternativ AWS)
Der Kern (`peter-und-co-editor/core`, `client`, `astro`, `build`) bleibt. Ersetzt werden nur die Adapter:

| Teil | Jetzt (Netlify) | Cloudflare (Pages + Workers + R2/D1) | AWS (S3 + CloudFront + Lambda, eu-central-2) |
|---|---|---|---|
| API-Einstieg | `netlify/functions/pe-*.ts` → `netlifyHandler` | Worker/Pages Function: `fetch(req, env)` → `erstelleApi(config, …).route(req)` (Request/Response sind schon Web-Standard) | Lambda-Handler, der API-Gateway- bzw. Function-URL-Events in `Request` umwandelt |
| Umgebungsvariablen | `process.env` | `env`-Bindings / Secrets (`wrangler secret put`) | Lambda-Env bzw. Secrets Manager |
| KV (Rate-Limit, Zähler) | Netlify Blobs (`adapter/netlify/blobs.ts`) | D1 oder Workers KV (Zähler besser D1, wegen Konsistenz) | DynamoDB |
| DeployStatus | Netlify-API (`adapter/netlify/deploy.ts`) | Cloudflare Pages Deployments-API oder GitHub Actions Status | GitHub Actions Status bzw. CloudFront-Invalidierung |
| Build/Deploy | Netlify baut bei Push | Pages baut bei Push (Build-Kommando gleich) | GitHub Actions: `npm run build` → S3 sync → CloudFront-Invalidierung |
| Krypto | `node:crypto` (scrypt, HMAC) | `nodejs_compat`-Flag (scrypt prüfen) oder auf WebCrypto PBKDF2 umstellen | Node-Runtime, unverändert |
| Header (`noindex`, `no-store`) | `netlify.toml` | `_headers`-Datei | CloudFront Response Headers Policy |

`COMMIT_REF`/`BRANCH` liest `build/build-info.ts` aus der Umgebung. Für andere Hosts entsprechend setzen (Cloudflare: `CF_PAGES_COMMIT_SHA`, `CF_PAGES_BRANCH`).

## Lokal testen
```bash
npm run pe:dev                 # http://localhost:4335/bearbeiten, Zugang in peter-und-co-editor/dev/test-zugang.json (wird erzeugt)
npm run pe:abnahme             # Klickpfad am Handy + alle Fehlerfälle, Screenshots docs/screenshots/pe-*.png
npm run pe:limits              # Zeichenlimits gegen das Layout
npm run pe:axe                 # Barrierefreiheit Editor + Startseite
npm run pe:sicherheit          # manipulierte Anfragen (zuletzt ausführen: sperrt das Login für 15 Min.)
```
`pe:dev` kopiert den Arbeitsstand nach `.pe-dev/repo` (eigenes Git-Repo). Jede Veröffentlichung wird dort wirklich gebaut (wie ein Deploy). Gegen echtes GitHub:
```bash
PE_GITHUB_TOKEN=… PE_GITHUB_REPO=nova-nails/nova-nails PE_BRANCH=editor-test npm run pe:dev -- --github --port 4336
```

## Offen / bekannt
- Netlify-Branch-Deploy, Netlify Blobs und das Bündeln der Functions durch Netlify sind ungetestet (lokal laufen die Module unter Node 24).
- Getestet mit Chromium (Playwright, Handy-Emulation 390 px). Echtes iPhone/Safari noch nicht: vor allem Kamera-Upload (HEIC wird von Safari beim Hochladen in JPEG umgewandelt) und `contenteditable="plaintext-only"` (Safari ok, Firefox ab 136).
- Nicht in v1: Fotos hinzufügen, Bereiche ein-/ausblenden oder verschieben, Leistungen hinzufügen.
