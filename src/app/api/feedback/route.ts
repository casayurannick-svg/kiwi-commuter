import { NextResponse } from 'next/server';
import { resolveFeedbackRepo } from '@/lib/github';

export const MAX_LENGTHS = { message: 2000, name: 80, contact: 120, urlContext: 300 } as const;
type Field = keyof typeof MAX_LENGTHS;

const LABELS: Record<Field, string> = {
  message: 'Message',
  name: 'Name',
  contact: 'Contact',
  urlContext: 'URL context',
};

/** Stop @mentions pinging GitHub users (zero-width space after @). */
function defuseMentions(text: string): string {
  return text.replace(/@(?=[A-Za-z0-9-])/g, '@​');
}

export async function POST(request: Request) {
  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    // Honeypot: real users never see or fill "website". Pretend success, create nothing.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ success: true });
    }

    const fields = {} as Record<Field, string>;
    for (const key of Object.keys(MAX_LENGTHS) as Field[]) {
      const value = body[key];
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return NextResponse.json({ error: `${LABELS[key]} must be text.` }, { status: 400 });
      }
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed.length > MAX_LENGTHS[key]) {
        return NextResponse.json(
          { error: `${LABELS[key]} must be ${MAX_LENGTHS[key]} characters or fewer.` },
          { status: 400 }
        );
      }
      fields[key] = trimmed;
    }

    if (!fields.message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('[Feedback API] GITHUB_TOKEN is not set.');
      return NextResponse.json(
        { error: 'GitHub integration token is not configured on the server.' },
        { status: 500 }
      );
    }

    // Fail closed: name and contact are only sent to an explicitly configured repo that
    // is not the public app repo. Otherwise the issue is anonymous.
    const { owner, repo, isPrivateTarget } = resolveFeedbackRepo();
    const message = defuseMentions(fields.message);

    const titleText = fields.message
      .replace(/https?:\/\/\S+/g, '')
      .replace(/@\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const titleSummary = titleText.length > 60 ? `${titleText.slice(0, 57)}...` : titleText || 'Feedback';
    const issueTitle = `[User Feedback] ${titleSummary}`;

    const issueBody = [
      '### User Feedback',
      '',
      ...(isPrivateTarget
        ? [
            `- **Submitted by:** ${defuseMentions(fields.name) || 'Anonymous'}`,
            `- **Contact:** ${defuseMentions(fields.contact) || 'Not provided'}`,
          ]
        : ['- **Submitted by:** Anonymous']),
      `- **URL Context:** \`${(fields.urlContext || 'None').replace(/`/g, '')}\``,
      `- **Timestamp:** ${new Date().toISOString()}`,
      '',
      '### Message',
      '',
      message,
      '',
      '---',
      '*Automatically created by KiwiCommuter In-App Feedback Reporter*',
    ].join('\n');

    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'KiwiCommuter-Feedback-Reporter',
      },
      body: JSON.stringify({ title: issueTitle, body: issueBody, labels: ['feedback'] }),
    });

    if (!githubResponse.ok) {
      console.error(`[Feedback API] GitHub API responded with status ${githubResponse.status}`);
      return NextResponse.json(
        { error: 'Failed to create GitHub issue. Try again later.' },
        { status: 502 }
      );
    }

    const data = await githubResponse.json();
    // Don't return the issue URL: it would reveal the private feedback repo.
    return NextResponse.json({ success: true, issueNumber: data.number });
  } catch (error) {
    console.error('[Feedback API] Unexpected error in feedback route:', error);
    return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
  }
}
