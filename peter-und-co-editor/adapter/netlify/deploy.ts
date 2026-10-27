// DeployStatus über die Netlify-API (nur mit PE_NETLIFY_TOKEN).
import type { DeployStatus } from '../../core/deploy.ts';

export function netlifyDeployStatus(apiToken: string, siteId: string, branch: string): DeployStatus {
  return {
    async stand(commit) {
      const r = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?branch=${encodeURIComponent(branch)}&per_page=10`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!r.ok) return null;
      const d = ((await r.json()) as { commit_ref: string; state: string }[]).find((x) => x.commit_ref === commit);
      if (!d) return null;
      if (d.state === 'ready') return 'fertig';
      if (d.state === 'error' || d.state === 'rejected') return 'fehler';
      return 'laeuft';
    },
  };
}
