// Stand des Builds: Commit und Branch. Netlify setzt COMMIT_REF/BRANCH/REPOSITORY_URL, lokal fragt es git.
import { execSync } from 'node:child_process';

const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};

export interface BuildInfo { commit: string; branch: string; repo: string }

export function buildInfo(): BuildInfo {
  const repoUrl = process.env.REPOSITORY_URL || git('remote get-url origin');
  const repo = (repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/) ?? [])[1] ?? '';
  return {
    commit: process.env.COMMIT_REF || git('rev-parse HEAD') || 'unbekannt',
    branch: process.env.BRANCH || process.env.HEAD || git('rev-parse --abbrev-ref HEAD') || 'main',
    repo,
  };
}
