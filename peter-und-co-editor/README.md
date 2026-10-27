# Peter & Co Editor

Bearbeiten-Modus für Kunden-Websites (Astro, statisch): Die Kundin ändert Texte, Zahlen und Fotos direkt auf der echten Seite unter `/bearbeiten`, ein Klick auf «Veröffentlichen» ergibt einen Commit und einen Deploy. Ohne Framework, ohne Drittdienst ausser GitHub und dem Hoster.

Erste Site: Nova Nails. Erst nach der zweiten Kundin in ein eigenes Repo/Paket auslagern.

## Aufbau
- `core/`: hosting-unabhängig (API, Schema, Sitzung, GitHub, Bildprüfung, Interfaces `KV` und `DeployStatus`)
- `adapter/netlify/`: Netlify-Anbindung (Env, Blobs, Deploy-API). Für Cloudflare/AWS nur diesen Ordner ersetzen
- `client/`: Editor im Browser · `astro/`: `pe()`, `PeText`, `Editor.astro` · `build/`: Prüfungen und Passwort · `dev/`: lokaler Server

## In 30 Minuten in eine neue Kunden-Site einbauen
1. **Kopieren:** Ordner `peter-und-co-editor/` und `netlify/functions/pe-*.ts` übernehmen. `npm i @netlify/blobs`; für Tests `npm i -D playwright @axe-core/playwright sharp`.
2. **Inhalte in JSON:** Alles, was die Kundin ändern darf, muss aus `content/*.json` kommen (fest eingebaute Titel in eine `texte.json` verschieben).
3. **Schema:** `pe.config.ts` im Repo-Root anlegen (Vorlage: Nova Nails). Pro Feld Typ (`text`, `mehrzeilig`, `zahl`, `bild`), `label` und `max` angeben. `*` steht für Listeneinträge, `bezug` benennt die Stelle in der Commit-Nachricht. Bei Bildern zusätzlich `ordner`, `verhaeltnis`, `maxPx`, `altFeld` und `altVorlage`.
4. **Attribute:** In jeder Komponente `const pe = peFuer(Astro.url);`, dann `data-pe={pe('datei.json#pfad')}` an das Element setzen, das genau den Wert zeigt. Für einen Teil eines Textes (z. B. die Zahl in «CHF 45») `<PeText f="…" v={wert} />` verwenden. **Keine Spread-Attribute** benutzen, sonst ändert sich das öffentliche HTML.
5. **Seiten:** Den Seiteninhalt in eine Komponente auslagern und ihn in `index.astro` und `bearbeiten.astro` verwenden (`<Base noindex>` + `<Editor config={config} />`), dazu `src/pages/pe-version.json.ts`. Bilder per `import.meta.glob` aus dem Dateinamen im JSON laden.
6. **Build:** `"build": "node peter-und-co-editor/build/pe.ts vorbereiten && astro build && node peter-und-co-editor/build/pe.ts seite"`. In `global.css` `@source not '../../peter-und-co-editor';` und `@source not '../../scripts/pe-*.mjs';` eintragen (Tailwind 4 macht sonst aus Wörtern in Editor- und Testcode Klassen), die Sitemap ohne `/bearbeiten` erzeugen und in `netlify.toml` die Header für `/bearbeiten` und `/pe-version.json` setzen (`noindex`, `no-store`).
7. **Prüfen:** `npm run build` meldet fehlende oder überzählige Felder. Danach `npm run pe:dev` und die Tests laufen lassen (Abnahme, Limits, axe, Sicherheit; Vorlagen in `scripts/pe-*.mjs`). Zum Schluss einen Vergleich `dist/index.html` vorher/nachher machen: Er muss byte-identisch sein.
8. **Einrichten:** Token, Passwort, Variablen und Benachrichtigung wie in `docs/bearbeiten-modus.md` → «Einrichtung Netlify».

## Grundsätze
- Server validiert alles nochmals: Nur Pfade aus dem Schema, die schon existieren, werden geändert. Nie neue Schlüssel oder Einträge, kein HTML.
- Ein Klick ergibt einen Commit. Konflikte gibt es nur, wenn genau dasselbe Feld inzwischen anders ist.
- Texte für die Kundin stehen alle in `core/texte.ts`: Du-Form, ohne Fachbegriffe.
