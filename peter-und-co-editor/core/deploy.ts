// Ist ein Commit schon online? Hosting-unabhängig: jetzt Netlify-API, später z. B. GitHub Actions oder CloudFront.

export type DeployStand = 'fertig' | 'laeuft' | 'fehler' | null;

/** null = unbekannt (der Browser vergleicht dann nur /pe-version.json mit dem neusten Commit). */
export interface DeployStatus {
  stand(commit: string): Promise<DeployStand>;
}
