import fs from 'fs';
import path from 'path';

/**
 * Infers the GitHub repository owner and name from:
 * 1. process.env.GITHUB_REPOSITORY (e.g. owner/repo)
 * 2. .git/config remote "origin" url
 * 3. Default fallback for KiwiCommuter
 */
export function inferGitHubRepo(): { owner: string; repo: string } {
  if (process.env.GITHUB_REPOSITORY) {
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] };
    }
  }

  try {
    const gitConfigPath = path.join(process.cwd(), '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const gitConfig = fs.readFileSync(gitConfigPath, 'utf8');
      const match = gitConfig.match(/url\s*=\s*.*github\.com[/:]([^/\s]+)\/([^/\s.]+)(?:\.git)?/i);
      if (match && match[1] && match[2]) {
        return { owner: match[1], repo: match[2] };
      }
    }
  } catch {
    // Proceed to fallback
  }

  return { owner: 'casayurannick-svg', repo: 'kiwi-commuter' };
}
