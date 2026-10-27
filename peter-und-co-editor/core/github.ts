// Zugriff auf das Repo: lesen am Stand X, alle Dateien in EINEM Commit schreiben (Git Data API).

export interface DateiAenderung {
  pfad: string;
  /** Text (UTF-8) oder base64 (Bilder); loeschen entfernt die Datei. */
  text?: string;
  base64?: string;
  loeschen?: boolean;
}

export interface RepoZugriff {
  head(): Promise<string>;
  datei(sha: string, pfad: string): Promise<string | null>;
  /** Wirft VeraltetFehler, wenn der Branch inzwischen weitergegangen ist. */
  commit(basis: string, dateien: DateiAenderung[], nachricht: string, autor: { name: string; email: string }): Promise<string>;
}

export class VeraltetFehler extends Error {}
export class RepoFehler extends Error {}

export function githubRepo(o: { token: string; repo: string; branch: string; fetcher?: typeof fetch }): RepoZugriff {
  const f = o.fetcher ?? fetch;
  const basis = `https://api.github.com/repos/${o.repo}`;
  const kopf = (accept = 'application/vnd.github+json') => ({
    Authorization: `Bearer ${o.token}`,
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'peter-und-co-editor',
  });
  async function rufe<T>(methode: string, pfad: string, body?: unknown): Promise<T> {
    const r = await f(`${basis}${pfad}`, { method: methode, headers: { ...kopf(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      if (methode === 'PATCH' && pfad.startsWith('/git/refs/') && (r.status === 422 || r.status === 409)) throw new VeraltetFehler(text);
      throw new RepoFehler(`GitHub ${methode} ${pfad}: ${r.status} ${text.slice(0, 300)}`);
    }
    return r.json() as Promise<T>;
  }
  const ref = `heads/${o.branch.split('/').map(encodeURIComponent).join('/')}`;

  return {
    async head() {
      return (await rufe<{ object: { sha: string } }>('GET', `/git/ref/${ref}`)).object.sha;
    },
    async datei(sha, pfad) {
      const r = await f(`${basis}/contents/${pfad.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`, { headers: kopf('application/vnd.github.raw+json') });
      if (r.status === 404) return null;
      if (!r.ok) throw new RepoFehler(`GitHub GET contents ${pfad}: ${r.status}`);
      return r.text();
    },
    async commit(basisSha, dateien, nachricht, autor) {
      const c = await rufe<{ tree: { sha: string } }>('GET', `/git/commits/${basisSha}`);
      const baum = [];
      for (const d of dateien) {
        if (d.loeschen) baum.push({ path: d.pfad, mode: '100644', type: 'blob', sha: null });
        else if (d.base64 != null) {
          const b = await rufe<{ sha: string }>('POST', '/git/blobs', { content: d.base64, encoding: 'base64' });
          baum.push({ path: d.pfad, mode: '100644', type: 'blob', sha: b.sha });
        } else baum.push({ path: d.pfad, mode: '100644', type: 'blob', content: d.text ?? '' });
      }
      const t = await rufe<{ sha: string }>('POST', '/git/trees', { base_tree: c.tree.sha, tree: baum });
      const neu = await rufe<{ sha: string }>('POST', '/git/commits', {
        message: nachricht,
        tree: t.sha,
        parents: [basisSha],
        author: { ...autor, date: new Date().toISOString() },
      });
      await rufe('PATCH', `/git/refs/${ref}`, { sha: neu.sha, force: false });
      return neu.sha;
    },
  };
}
