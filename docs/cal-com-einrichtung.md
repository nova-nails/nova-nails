# Online-Buchung mit Cal.com einrichten

Für Ramon und Julia, Schritt für Schritt. Dauer ca. 30 Minuten. Kosten: keine (Cal.com Free).

Ergebnis: Auf der Startseite gibt es die Sektion «Termin buchen» mit Julias Cal.com-Kalender (Inline-Embed). Kundinnen wählen dort direkt einen freien Termin. Alle «Termin buchen»-Buttons scrollen zu dieser Sektion. Der Kalender lädt erst kurz bevor die Sektion sichtbar wird (schnelle Startseite).

Aktuell ist ein Beispiel-Link von Ramon eingetragen (`https://cal.com/raxmon/nova-nails`). Nach Schritt 1–4 durch Julias Link ersetzen.

## Voraussetzung
- Julia hat eine eigene E-Mail-Adresse (siehe `docs/todo-inhaberin.md`, Punkt 2).

## 1. Konto anlegen
1. Auf <https://cal.com/signup> mit **Julias E-Mail-Adresse** registrieren (nicht mit Google, damit der Kalender unabhängig bleibt).
2. Region: cal.eu nimmt keine Anmeldungen mehr an (Stand 2026-10-29). Konto auf cal.com, Datenhaltung international, die Datenschutzerklärung nennt die USA-Übermittlung.
3. Benutzername: Vorschlag **`novanails`** → Buchungsseite `https://cal.com/novanails`. Falls vergeben: `nova-nails` oder `novanails-studio`.
4. Name: «Nova Nails by Julia Tellenbach». Sprache Deutsch.
5. Zeitzone **Europe/Zurich**.

## 2. Verfügbarkeit
1. Menü «Verfügbarkeit» → Standardplan bearbeiten.
2. **Montag bis Freitag, 09:00–19:00**, Samstag und Sonntag aus.
3. Zeitzone Europe/Zurich.
4. Ferien oder freie Tage später direkt dort als «Datumsüberschreibung» eintragen.
5. Optional: Julias Handy-Kalender verbinden, damit private Termine automatisch blockiert werden.

## 3. Event-Typen (= Leistungen)
Je Leistung aus `content/preise.json` einen Event-Typ anlegen. Bei jedem Event-Typ gleich einstellen:

| Event-Typ | Dauer | Slug (URL-Ende) |
|---|---|---|
| Gelnägel neues Set | 120 Min. | `gelnaegel-neues-set` |
| Auffüllen Gelnägel | 90 Min. | `auffuellen-gelnaegel` |
| Nagelverstärkung | 60 Min. (Spanne 30–60, längere Dauer, damit nichts überbucht wird) | `nagelverstaerkung` |
| Maniküre | 30 Min. | `manikuere` |
| Entfernen (Gel/Lack) | 30 Min. | `entfernen` |

Einstellungen in jedem Event-Typ:
- **Ort:** «Persönlich» → Beckenriederstrasse 28, 6374 Buochs
- **Pufferzeit:** 15 Min. nach dem Termin (Aufräumen, Desinfektion)
- **Mindestvorlauf:** 2 Std. (seit 2026-10-29, vorher 12 Std.)
- **Beschreibung:** Kurztext aus `content/preise.json` plus Absageregel:
  > Absage kostenlos bis 24 Std. vorher, danach CHF 50.
- **Keine Online-Zahlung** (Zahlungs-App nicht verbinden). Bezahlt wird im Studio.

## 4. Buchungsfragen
In jedem Event-Typ unter «Erweitert» → «Buchungsfragen»:
- **Name** (Pflicht, ist schon da)
- **E-Mail** (Pflicht bei Cal.com, für die Bestätigung)
- **Telefon** (Pflicht, Typ «Telefon»): «Für Rückfragen per WhatsApp»
- **Notiz** (optional, Mehrzeilig): «Wunschdesign oder Hinweise»

Bestätigungen und Erinnerungen per E-Mail sind in Free enthalten.

## 5. Link in die Website eintragen
1. In `content/site.json` bei `booking.url` den Profil-Link eintragen, z. B. `"url": "https://cal.com/novanails"` (Kalender zeigt dann alle Leistungen zur Auswahl). 
2. Optional Direktlinks je Leistung: unter `booking.events` den Slug aus der Tabelle oben eintragen (genau wie in Cal.com). Dann erscheint auf der Leistungskarte «Diese Leistung buchen». Leer = kein Direktlink.
3. `npm run build` und kurz prüfen: «Termin buchen» (Header, Hero, Anfahrt) scrollt zur Sektion mit dem Kalender, der Kalender zeigt Julias Termine, die Datenschutzerklärung zeigt den Abschnitt «Online-Buchung (Cal.com)».
4. Committen und pushen:
   ```bash
   git add content/site.json && git commit -m "Online-Buchung: Cal.com-Link" && git push
   ```
   Netlify stellt die Änderung automatisch online.

Solange `booking.url` leer ist, öffnet «Termin buchen» WhatsApp mit vorausgefülltem Text.
