// Alle Texte, die Julia sieht. Du-Form, keine Fachbegriffe. {x} wird ersetzt.

export const T = {
  hinweis: 'Tippe auf einen Text oder ein Foto, um es zu ändern. Wenn du fertig bist, tippe unten auf Veröffentlichen.',
  hinweisOk: 'Alles klar',

  loginTitel: 'Website bearbeiten',
  loginText: 'Melde dich an, um Texte, Preise und Fotos von {site} zu ändern.',
  loginEmail: 'E-Mail',
  loginPasswort: 'Passwort',
  loginKnopf: 'Anmelden',
  loginLaeuft: 'Einen Moment …',
  loginFalsch: 'E-Mail oder Passwort stimmt nicht. Versuch es nochmal.',
  loginGesperrt: 'Zu viele Versuche. Bitte warte {min} Minuten und versuch es dann nochmal.',
  loginVergessen: 'Passwort vergessen? Schreib Ramon, er setzt es dir neu.',
  loginAbgelaufen: 'Bitte melde dich nochmal an. Deine Änderungen sind gespeichert.',

  keineAenderungen: 'Noch keine Änderungen',
  aenderungen1: '1 Änderung',
  aenderungenN: '{n} Änderungen',
  verwerfen: 'Verwerfen',
  veroeffentlichen: 'Veröffentlichen',
  zeigen: 'Zeig mir, was ich ändern kann',
  mehr: 'Mehr',
  hilfe: 'Kurze Hilfe',
  ansehen: 'Website ansehen',
  abmelden: 'Abmelden',
  verwerfenFrage: 'Alle {n} Änderungen verwerfen? Das kann man nicht rückgängig machen.',
  verwerfenJa: 'Ja, verwerfen',
  abbrechen: 'Abbrechen',

  rueckgaengig: 'Rückgängig',
  zahlHinweis: 'Bitte nur eine Zahl, z. B. {beispiel}',
  zahlZuGross: 'Diese Zahl ist zu gross. Höchstens {max}.',
  leerHinweis: 'Dieses Feld darf nicht leer sein. Der alte Text ist wieder da.',
  limitHinweis: 'Mehr Platz hat es hier nicht.',
  linkAus: 'Links sind beim Bearbeiten ausgeschaltet. Unter «Mehr» → «Website ansehen» kannst du alles ausprobieren.',

  fotoErsetzen: 'Foto ersetzen',
  fotoBeschreibung: 'Beschreibung',
  fotoBeschreibungHilfe: 'Kurz beschreiben, was zu sehen ist. Das hilft blinden Menschen und Google.',
  fotoBeschreibungFertig: 'Fertig',
  fotoLaedt: 'Foto wird vorbereitet …',
  fotoZuschneiden: 'Ausschnitt wählen',
  fotoZuschneidenHilfe: 'Verschiebe das Foto mit dem Finger. Mit dem Regler zoomst du.',
  fotoZoom: 'Zoom',
  fotoUebernehmen: 'Foto übernehmen',
  fotoKaputt: 'Dieses Foto klappt leider nicht. Versuch ein anderes oder mach einen Screenshot davon.',
  fotoSpeicherVoll: 'Dein Foto ist eingesetzt. Veröffentliche bald, denn beim Neuladen der Seite wäre es weg.',

  sendet: 'Wird gespeichert …',
  erfolg: 'Super! Deine Änderungen sind in ca. 1 Minute online.',
  online: 'Fertig, deine Änderungen sind online!',
  onlineAnsehen: 'Website ansehen',
  weiter: 'Weiter bearbeiten',
  wirdOnlineGestellt: 'Deine letzte Änderung wird gerade online gestellt …',
  wirdOnlineGestelltHilfe: 'Das dauert meistens etwa eine Minute. Danach kannst du weiter bearbeiten.',
  vielVeroeffentlicht: 'Du hast diesen Monat schon {n}-mal veröffentlicht. Tipp: Sammle mehrere Änderungen und veröffentliche sie zusammen.',
  trotzdem: 'Jetzt veröffentlichen',
  spaeter: 'Später',
  nichtsZuTun: 'Diese Änderungen sind schon online.',

  konfliktTitel: 'Dieses Feld wurde inzwischen geändert. Deine Version behalten?',
  konfliktNeu: 'Inzwischen online',
  konfliktDeine: 'Deine Version',
  konfliktBehalten: 'Meine behalten',
  konfliktUebernehmen: 'Die neue nehmen',

  offline: 'Keine Verbindung. Deine Änderungen sind gespeichert, versuch es gleich nochmal.',
  fehlerAllgemein: 'Das hat nicht geklappt. Deine Änderungen sind gespeichert, versuch es gleich nochmal. Klappt es wieder nicht, schreib Ramon.',
  fehlerUngueltig: 'Bei «{feld}» passt etwas nicht. Bitte schau es nochmal an.',
  buildKaputt: 'Das hat nicht geklappt, Ramon ist informiert. Deine Website bleibt wie vorher online.',
  buildKaputtWeiter: 'Trotzdem weiterarbeiten',
  verlassen: 'Du hast Änderungen, die noch nicht veröffentlicht sind.',
  ok: 'OK',
  schliessen: 'Schliessen',
} as const;

export type TextSchluessel = keyof typeof T;

export function t(k: TextSchluessel, werte: Record<string, string | number> = {}): string {
  return T[k].replace(/\{(\w+)\}/g, (_, n) => String(werte[n] ?? ''));
}

/** Fehlercodes der Functions (JSON { fehler }) */
export type FehlerCode =
  | 'nicht_angemeldet'
  | 'csrf'
  | 'login_falsch'
  | 'zu_viele_versuche'
  | 'ungueltig'
  | 'konflikt'
  | 'github'
  | 'konfig'
  | 'methode';
