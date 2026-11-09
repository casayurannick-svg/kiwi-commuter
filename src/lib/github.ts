/**
 * Infers the GitHub repository owner and name from:
 * 1. process.env.GITHUB_REPOSITORY (e.g. owner/repo)
 * 2. Default fallback for KiwiCommuter
 * (No .git/config read: Cloudflare Workers has no runtime filesystem.)
 */
export function inferGitHubRepo(): { owner: string; repo: string } {
  if (process.env.GITHUB_REPOSITORY) {
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] };
    }
  }

  return { owner: 'casayurannick-svg', repo: 'kiwi-commuter' };
}

/** The public app repo. Feedback with contact details must never be filed here. */
export const PUBLIC_APP_REPO = { owner: 'casayurannick-svg', repo: 'kiwi-commuter' } as const;

/**
 * Where feedback issues go, and whether it is safe to include name and contact.
 * Safe only when GITHUB_REPOSITORY is set, well formed, and not the public app repo.
 */
export function resolveFeedbackRepo(): { owner: string; repo: string; isPrivateTarget: boolean } {
  const { owner, repo } = inferGitHubRepo();
  const configured = (process.env.GITHUB_REPOSITORY ?? '').trim().toLowerCase();
  const isPublic =
    owner.toLowerCase() === PUBLIC_APP_REPO.owner && repo.toLowerCase() === PUBLIC_APP_REPO.repo;
  const wellFormed = /^[a-z0-9-]+\/[a-z0-9._-]+$/.test(configured);
  return { owner, repo, isPrivateTarget: wellFormed && !isPublic };
}
