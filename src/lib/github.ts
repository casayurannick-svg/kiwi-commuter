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
