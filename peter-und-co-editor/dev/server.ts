// Lokaler Server für den Bearbeiten-Modus: dieselbe Core-API wie auf Netlify, aber
//   --lokal  (Standard) Repo-Kopie in .pe-dev/repo statt GitHub, jeder Commit wird wirklich gebaut (wie ein Deploy)
//   --github echtes GitHub (PE_GITHUB_TOKEN, PE_GITHUB_REPO, PE_BRANCH, z. B. editor-test), Seite aus ./dist
// Start: npm run pe:dev [-- --github] [-- --port 4325]
// Test-Zugang: peter-und-co-editor/dev/test-zugang.json (nur lokal).
import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import type { PeConfig } from '../core/schema.ts';
import { erstelleApi } from '../core/api.ts';
import type { DeployStand } from '../core/deploy.ts';
import { githubRepo, type RepoZugriff, VeraltetFehler } from '../core/github.ts';
import { hashPasswort, neuesSecret } from '../core/sitzung.ts';
import { speicherImRam } from '../core/speicher.ts';
import { buildInfo } from '../build/build-info.ts';

const arg = (n: string) => process.argv.includes(`--${n}`);
const wert = (n: string, d: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const root = process.cwd();
const PORT = Number(wert('port', '4335'));
const GITHUB = arg('github');
const DEPLOY_MS = Number(process.env.PE_DEV_DEPLOY_MS ?? 2000);
const config: PeConfig = (await import(pathToFileURL(join(root, 'pe.config.ts')).href)).default;
// Test-Zugang nur für diesen lokalen Server; beim ersten Start zufällig erzeugt (nicht im Repo)
const zugangDatei = join(root, 'peter-und-co-editor/dev/test-zugang.json');
if (!existsSync(zugangDatei)) {
  writeFileSync(zugangDatei, `${JSON.stringify({ _hinweis: 'Nur für den lokalen Testserver (npm run pe:dev). Nie online verwenden.', email: 'julia@nova.localhost', passwort: `lokal-${neuesSecret().slice(0, 12)}` }, null, 2)}\n`);
}
const zugang = JSON.parse(readFileSync(zugangDatei, 'utf8')) as { email: string; passwort: string };

const sh = (dir: string, args: string[], o: { input?: Buffer | string; env?: Record<string, string> } = {}) =>
  execFileSync('git', ['-C', dir, ...args], { input: o.input, env: { ...process.env, ...o.env }, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });

/** RepoZugriff über git-Plumbing (gleiche Semantik wie die GitHub-API: ein Commit, Ref nur vorwärts). */
function gitRepo(dir: string, branch: string): RepoZugriff {
  return {
    async head() { return sh(dir, ['rev-parse', `refs/heads/${branch}`]).toString().trim(); },
    async datei(sha, pfad) {
      try { return sh(dir, ['show', `${sha}:${pfad}`]).toString(); } catch { return null; }
    },
    async commit(basis, dateien, nachricht, autor) {
      const idx = join(tmpdir(), `pe-index-${process.pid}-${Date.now()}`);
      const env = { GIT_INDEX_FILE: idx, GIT_AUTHOR_NAME: autor.name, GIT_AUTHOR_EMAIL: autor.email, GIT_COMMITTER_NAME: 'Bearbeiten-Modus (lokal)', GIT_COMMITTER_EMAIL: 'lokal@localhost' };
      try {
        sh(dir, ['read-tree', basis], { env });
        for (const d of dateien) {
          if (d.loeschen) { sh(dir, ['update-index', '--force-remove', d.pfad], { env }); continue; }
          const inhalt = d.base64 != null ? Buffer.from(d.base64, 'base64') : Buffer.from(d.text ?? '');
          const blob = sh(dir, ['hash-object', '-w', '--stdin'], { input: inhalt }).toString().trim();
          sh(dir, ['update-index', '--add', '--cacheinfo', `100644,${blob},${d.pfad}`], { env });
        }
        const baum = sh(dir, ['write-tree'], { env }).toString().trim();
        const commit = sh(dir, ['commit-tree', baum, '-p', basis, '-m', nachricht], { env }).toString().trim();
        try { sh(dir, ['update-ref', `refs/heads/${branch}`, commit, basis]); } catch { throw new VeraltetFehler('ref'); }
        return commit;
      } finally {
        rmSync(idx, { force: true });
      }
    },
  };
}

// ---------- Repo + «Deploy» ----------
const info = buildInfo();
const branch = GITHUB ? process.env.PE_BRANCH || 'editor-test' : info.branch;
const devDir = join(root, '.pe-dev');
const repoDir = join(devDir, 'repo');
let liveDir = join(root, 'dist');
const deploys = new Map<string, DeployStand>();
let liveCommit = info.commit;
let repo: RepoZugriff;

function baue(commit: string): Promise<boolean> {
  return new Promise((res) => {
    // detached: der Branch bleibt, wo er ist (ein reset würde gleichzeitige Commits verwerfen)
    sh(repoDir, ['checkout', '-q', '-f', '--detach', commit]);
    const p = spawn('npm', ['run', 'build'], { cwd: repoDir, env: { ...process.env, COMMIT_REF: commit, BRANCH: branch }, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', (d) => (log += d));
    p.stderr.on('data', (d) => (log += d));
    p.on('close', (code) => {
      if (code !== 0) console.log(`[deploy] ${commit.slice(0, 7)} FEHLER\n${log.split('\n').filter((z) => /✗|rror|-  /.test(z)).slice(0, 8).join('\n')}`);
      res(code === 0);
    });
  });
}

let deployLaeuft = false;
async function deployNeuster() {
  if (deployLaeuft) return;
  deployLaeuft = true;
  try {
    for (;;) {
      const head = await repo.head();
      if (deploys.has(head)) break;
      deploys.set(head, 'laeuft');
      await new Promise((r) => setTimeout(r, DEPLOY_MS));
      const ok = await baue(head);
      deploys.set(head, ok ? 'fertig' : 'fehler');
      if (ok) {
        const neu = join(devDir, `live-${Date.now()}`);
        cpSync(join(repoDir, 'dist'), neu, { recursive: true });
        const alt = liveDir;
        liveDir = neu;
        liveCommit = head;
        if (alt.startsWith(devDir)) rmSync(alt, { recursive: true, force: true });
        console.log(`[deploy] ${head.slice(0, 7)} online`);
      }
    }
  } finally {
    deployLaeuft = false;
  }
}

if (GITHUB) {
  for (const k of ['PE_GITHUB_TOKEN', 'PE_GITHUB_REPO']) if (!process.env[k]) throw new Error(`--github braucht ${k}`);
  repo = githubRepo({ token: process.env.PE_GITHUB_TOKEN!, repo: process.env.PE_GITHUB_REPO!, branch });
  liveCommit = await repo.head();
  // Seite aus ./dist, aber mit dem Stand von GitHub (es wird nichts gebaut)
  console.log(`GitHub: ${process.env.PE_GITHUB_REPO} · ${branch} · ${liveCommit.slice(0, 7)}`);
} else {
  // Frische Kopie des aktuellen Arbeitsstands (inkl. nicht committeter Dateien) als eigenes Repo
  rmSync(devDir, { recursive: true, force: true });
  mkdirSync(repoDir, { recursive: true });
  const dateien = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter((f) => f && existsSync(join(root, f)) && !f.startsWith('.pe-dev/'));
  for (const f of dateien) cpSync(join(root, f), join(repoDir, f), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(repoDir, 'node_modules'));
  const g = (a: string[]) => sh(repoDir, a, { env: { GIT_AUTHOR_NAME: 'Ramon', GIT_AUTHOR_EMAIL: 'ramon@localhost', GIT_COMMITTER_NAME: 'Ramon', GIT_COMMITTER_EMAIL: 'ramon@localhost' } });
  g(['init', '-q', '-b', branch]);
  g(['add', '-A']);
  g(['commit', '-q', '-m', 'Lokaler Stand']);
  repo = gitRepo(repoDir, branch);
  console.log('Baue lokalen Stand …');
  await deployNeuster();
}

// ---------- API ----------
const kv = speicherImRam();
const api = erstelleApi(config, {
  email: zugang.email,
  passwortHash: await hashPasswort(zugang.passwort),
  sessionSecret: neuesSecret(),
  repo,
  kv,
  deploy: { stand: async (c) => (GITHUB ? (c === liveCommit ? 'fertig' : null) : deploys.get(c) ?? null) },
  log: (...x) => console.log('[api]', ...x),
});

const TYPEN: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

createServer((req, res) => {
  bediene(req, res).catch((e) => {
    console.error('[dev]', e);
    if (!res.headersSent) res.writeHead(500).end('Fehler');
  });
}).listen(PORT, () => {
  console.log(`Bearbeiten-Modus lokal: http://localhost:${PORT}/bearbeiten  (Zugang: peter-und-co-editor/dev/test-zugang.json)`);
});

async function bediene(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = Buffer.concat(chunks);

  if (url.pathname.startsWith('/api/pe/')) {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    headers.set('x-forwarded-for', req.socket.remoteAddress ?? '');
    const antwort = await api.route(new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method!) ? undefined : body }));
    // Lokal über http: «Secure» würde Safari das Cookie verweigern
    const kopf: Record<string, string> = {};
    antwort.headers.forEach((v, k) => (kopf[k] = k === 'set-cookie' && url.hostname !== 'localhost' ? v.replace('; Secure', '') : v));
    res.writeHead(antwort.status, kopf).end(Buffer.from(await antwort.arrayBuffer()));
    if (antwort.ok && url.pathname === '/api/pe/veroeffentlichen' && !GITHUB) void deployNeuster();
    if (antwort.ok && url.pathname === '/api/pe/veroeffentlichen' && GITHUB) setTimeout(async () => (liveCommit = await repo.head()), DEPLOY_MS);
    return;
  }

  // Test-Hilfen (nur lokal): «Ramon ändert etwas» und «kaputter Stand»
  if (url.pathname === '/_dev/fremd' && req.method === 'POST' && !GITHUB) {
    const { datei, text } = JSON.parse(body.toString()) as { datei: string; text: string };
    const head = await repo.head();
    const c = await repo.commit(head, [{ pfad: datei, text }], 'Ramon: Änderung (Test)', { name: 'Ramon', email: 'ramon@localhost' });
    void deployNeuster();
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ commit: c }));
  }
  if (url.pathname === '/_dev/datei' && !GITHUB) {
    const t = await repo.datei(await repo.head(), url.searchParams.get('pfad') ?? '');
    return res.writeHead(t == null ? 404 : 200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(t ?? '');
  }
  if (url.pathname === '/_dev/monat' && req.method === 'POST') {
    await kv.set(`veroeffentlicht:${new Date().toISOString().slice(0, 7)}`, Number(url.searchParams.get('n') ?? 0));
    return res.writeHead(200).end('ok');
  }
  if (url.pathname === '/_dev/log' && !GITHUB) {
    return res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(sh(repoDir, ['log', '--format=%h %an: %s', `refs/heads/${branch}`]).toString());
  }

  if (url.pathname === '/pe-version.json') {
    return res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ commit: liveCommit }));
  }
  let pfad = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (pfad.endsWith('/')) pfad += 'index.html';
  let datei = join(liveDir, pfad);
  if (!existsSync(datei) && existsSync(`${datei}.html`)) datei = `${datei}.html`;
  if (!datei.startsWith(liveDir) || !existsSync(datei) || !statSync(datei).isFile()) {
    return res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(readFileSync(join(liveDir, '404.html')));
  }
  let inhalt: Buffer | string = readFileSync(datei);
  // --github: die Seite ist lokal gebaut, «online» ist aber der GitHub-Stand
  if (GITHUB && datei.endsWith('bearbeiten.html')) inhalt = inhalt.toString().replace(/"commit":"[0-9a-f]+"/, `"commit":"${liveCommit}"`);
  res.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(inhalt);
}

process.on('SIGINT', () => {
  if (!GITHUB) writeFileSync(join(devDir, 'beendet'), new Date().toISOString());
  process.exit(0);
});
