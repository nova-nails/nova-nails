// Netlify-Adapter: Umgebungsvariablen lesen, Core-API aufrufen. Keine Logik hier.
import type { PeConfig } from '../../core/schema.ts';
import { erstelleApi } from '../../core/api.ts';
import { githubRepo } from '../../core/github.ts';
import { netlifyBlobs } from './blobs.ts';
import { netlifyDeployStatus } from './deploy.ts';

export interface BuildInfo { commit: string; branch: string; repo: string }

const PFLICHT = ['PE_EMAIL', 'PE_PASSWORT_HASH', 'PE_SESSION_SECRET', 'PE_GITHUB_TOKEN'] as const;

export function netlifyHandler(config: PeConfig, info: BuildInfo) {
  const env = process.env;
  const repo = env.PE_GITHUB_REPO || info.repo;
  const branch = env.PE_BRANCH || info.branch;
  const fehlt = [...PFLICHT.filter((k) => !env[k]), ...(repo ? [] : ['PE_GITHUB_REPO'])];
  if (fehlt.length) {
    console.error('[pe] Einrichtung unvollständig, fehlt:', fehlt.join(', '));
    return async () => new Response(JSON.stringify({ fehler: 'konfig' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  const siteId = env.PE_NETLIFY_SITE_ID || env.SITE_ID;
  const api = erstelleApi(config, {
    email: env.PE_EMAIL!,
    passwortHash: env.PE_PASSWORT_HASH!,
    sessionSecret: env.PE_SESSION_SECRET!,
    repo: githubRepo({ token: env.PE_GITHUB_TOKEN!, repo, branch }),
    kv: netlifyBlobs(),
    deploy: env.PE_NETLIFY_TOKEN && siteId ? netlifyDeployStatus(env.PE_NETLIFY_TOKEN, siteId, branch) : undefined,
  });
  return (req: Request) => api.route(req);
}
