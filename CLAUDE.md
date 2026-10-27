# Nova Nails – Website

Gehirn: Obsidian-Vault PeRaVault. Bei Start 50-Brain/index.md lesen. Projektnotiz: 10-Projekte/nova-nails/README.md

- Astro 7 + Tailwind 4, statisch. Dev: `npm run dev` (Port 4324), Handy: `npm run dev -- --host`
- Bearbeiten-Modus: Felder in `pe.config.ts`, wiederverwendbarer Teil in `peter-und-co-editor/` (Kern ohne Hosting-Imports). Neue sichtbare Texte über `data-pe={pe(…)}` + Schema, `npm run build` prüft beides
- Inhalte und Schalter nur in `content/*.json` (Schalter zentral in `content/site.json`), Preise nur in `content/preise.json`
- `[TODO: …]`-Stellen nicht mit erfundenen Inhalten füllen
- Logo-Assets: `npm run assets` (Quelle `brand/`, nie überschreiben)
- Keine Embeds, kein Tracking, keine Cookies. Kein Co-Authored-By.
