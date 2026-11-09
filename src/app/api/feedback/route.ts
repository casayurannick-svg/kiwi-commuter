import { NextResponse } from 'next/server';
import { inferGitHubRepo } from '@/lib/github';

interface FeedbackRequestBody {
  name?: string;
  contact?: string;
  message: string;
  urlContext?: string;
  honeypot?: string; // hidden field for bots
}

export async function POST(request: Request) {
  const MAX_MESSAGE = 2000;
  const MAX_NAME = 80;
  const MAX_CONTACT = 120;
  const MAX_URL_CONTEXT = 300;

  try {
    const body: FeedbackRequestBody = await request.json();

    // Required message
    if (!body || typeof body.message !== 'string' || !body.message.trim()) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    // Enforce caps
    if (body.message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: 'Message exceeds maximum length of 2000 characters.' }, { status: 400 });
    }
    if (body.name && body.name.length > MAX_NAME) {
      return NextResponse.json({ error: 'Name exceeds maximum length of 80 characters.' }, { status: 400 });
    }
    if (body.contact && body.contact.length > MAX_CONTACT) {
      return NextResponse.json({ error: 'Contact exceeds maximum length of 120 characters.' }, { status: 400 });
    }
    if (body.urlContext && body.urlContext.length > MAX_URL_CONTEXT) {
      return NextResponse.json({ error: 'URL context exceeds maximum length of 300 characters.' }, { status: 400 });
    }

    // Honeypot – if filled, silently succeed without creating an issue
    if (body.honeypot) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('[Feedback API] GITHUB_TOKEN is not set.');
      return NextResponse.json({ error: 'GitHub integration token is not configured on the server.' }, { status: 500 });
    }

    const { owner, repo } = inferGitHubRepo();
    const repoEnv = process.env.GITHUB_REPOSITORY; // determines if we can publish contact info
    const name = repoEnv ? (body.name?.trim() || 'Anonymous') : undefined;
    const contact = repoEnv ? (body.contact?.trim() || 'Not provided') : undefined;
    const urlContext = body.urlContext?.trim() || 'None';
    const message = body.message.trim();

    // Build title, strip @mentions and URLs
    const rawTitle = message.length > 60 ? `${message.slice(0, 57)}...` : message;
    const cleanedTitle = rawTitle.replace(/@\S+/g, '').replace(/https?:\/\/\S+/g, '').trim();
    const issueTitle = `[User Feedback] ${cleanedTitle}`;

    const issueBodyLines = [
      '### User Feedback',
      '',
      `- **Submitted by:** ${name ?? 'Anonymous'}`,
      ...(name && contact ? [`- **Contact:** ${contact}`] : []),
      `- **URL Context:** \`${urlContext}\``,
      `- **Timestamp:** ${new Date().toISOString()}`,
      '',
      '---',
      '',
      '### Message',
      message,
      '',
      '---',
      '*Automatically created by KiwiCommuter In-App Feedback Reporter*',
    ];
    const issueBody = issueBodyLines.filter(Boolean).join('\n');

    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'KiwiCommuter-Feedback-Reporter',
      },
      body: JSON.stringify({ title: issueTitle, body: issueBody, labels: ['feedback'] }),
    });

    if (!githubResponse.ok) {
      const errText = await githubResponse.text();
      console.error(`[Feedback API] GitHub API responded with status ${githubResponse.status}:`, errText);
      return NextResponse.json({ error: 'Failed to create GitHub issue. Try again later.' }, { status: githubResponse.status });
    }

    const data = await githubResponse.json();
    return NextResponse.json({ success: true, issueNumber: data.number, issueUrl: data.html_url });
  } catch (error) {
    console.error('[Feedback API] Unexpected error in feedback route:', error);
    return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
  }
}
