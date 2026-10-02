import { NextResponse } from 'next/server';
import { inferGitHubRepo } from '@/lib/github';

interface FeedbackRequestBody {
  name?: string;
  contact?: string;
  message: string;
  urlContext?: string;
}

export async function POST(request: Request) {
  try {
    const body: FeedbackRequestBody = await request.json();

    if (!body || typeof body.message !== 'string' || !body.message.trim()) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('[Feedback API] GITHUB_TOKEN is not set.');
      return NextResponse.json(
        { error: 'GitHub integration token is not configured on the server.' },
        { status: 500 }
      );
    }

    const { owner, repo } = inferGitHubRepo();
    const name = body.name?.trim() || 'Anonymous';
    const contact = body.contact?.trim() || 'Not provided';
    const urlContext = body.urlContext?.trim() || 'None';
    const message = body.message.trim();

    const titleSummary = message.length > 60 ? `${message.slice(0, 57)}...` : message;
    const issueTitle = `[User Feedback] ${titleSummary}`;

    const issueBody = [
      '### User Feedback',
      '',
      `- **Submitted by:** ${name}`,
      `- **Contact:** ${contact}`,
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
    ].join('\n');

    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'KiwiCommuter-Feedback-Reporter',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ['feedback'],
      }),
    });

    if (!githubResponse.ok) {
      const errText = await githubResponse.text();
      console.error(`[Feedback API] GitHub API responded with status ${githubResponse.status}:`, errText);
      return NextResponse.json(
        { error: 'Failed to create GitHub issue. Try again later.' },
        { status: githubResponse.status }
      );
    }

    const data = await githubResponse.json();

    return NextResponse.json({
      success: true,
      issueNumber: data.number,
      issueUrl: data.html_url,
    });
  } catch (error) {
    console.error('[Feedback API] Unexpected error in feedback route:', error);
    return NextResponse.json(
      { error: 'An unexpected internal error occurred.' },
      { status: 500 }
    );
  }
}
