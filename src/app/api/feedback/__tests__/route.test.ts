import assert from 'node:assert';
import { describe, it } from 'node:test';
import { POST } from '../route';
import { inferGitHubRepo } from '@/lib/github';

describe('src/app/api/feedback/route.ts - In-App Feedback Reporter API', () => {
  it('inferGitHubRepo infers repository owner and name correctly', () => {
    // Test env override
    const origEnv = process.env.GITHUB_REPOSITORY;
    try {
      process.env.GITHUB_REPOSITORY = 'test-org/test-repo';
      const repoFromEnv = inferGitHubRepo();
      assert.strictEqual(repoFromEnv.owner, 'test-org');
      assert.strictEqual(repoFromEnv.repo, 'test-repo');

      delete process.env.GITHUB_REPOSITORY;
      const repoFromGit = inferGitHubRepo();
      assert.strictEqual(repoFromGit.owner, 'casayurannick-svg');
      assert.strictEqual(repoFromGit.repo, 'kiwi-commuter');
    } finally {
      if (origEnv !== undefined) {
        process.env.GITHUB_REPOSITORY = origEnv;
      } else {
        delete process.env.GITHUB_REPOSITORY;
      }
    }
  });

  it('rejects POST request with missing or empty message with 400 Bad Request', async () => {
    const emptyRequest = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tester', contact: 'test@example.com', message: '   ' }),
    });

    const response = await POST(emptyRequest);
    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.error, 'Message is required.');
  });

  it('returns 500 if GITHUB_TOKEN is not configured', async () => {
    const origToken = process.env.GITHUB_TOKEN;
    try {
      delete process.env.GITHUB_TOKEN;

      const request = new Request('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Great app!' }),
      });

      const response = await POST(request);
      assert.strictEqual(response.status, 500);
      const data = await response.json();
      assert.strictEqual(data.error, 'GitHub integration token is not configured on the server.');
    } finally {
      if (origToken !== undefined) {
        process.env.GITHUB_TOKEN = origToken;
      }
    }
  });

  it('successfully creates an issue via GitHub API with feedback label and cleanly formatted body', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined = undefined;

    try {
      // Mock fetch
      global.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
        capturedUrl = String(url);
        capturedOptions = options;
        return new Response(
          JSON.stringify({
            number: 42,
            html_url: 'https://github.com/casayurannick-svg/kiwi-commuter/issues/42',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      process.env.GITHUB_TOKEN = 'test_token_xyz';

      const request = new Request('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          contact: 'jane@example.co.nz',
          message: 'The Devonport ferry fare shows up nicely, but please add bicycle racks info!',
          urlContext: '?origin=devonport&destination=cbd&transit=FERRY',
        }),
      });

      const response = await POST(request);
      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.issueNumber, 42);
      assert.strictEqual(data.issueUrl, 'https://github.com/casayurannick-svg/kiwi-commuter/issues/42');

      // Verify captured GitHub API call
      assert.strictEqual(capturedUrl, 'https://api.github.com/repos/casayurannick-svg/kiwi-commuter/issues');
      assert.strictEqual(capturedOptions.method, 'POST');
      assert.strictEqual(capturedOptions.headers.Authorization, 'Bearer test_token_xyz');

      const parsedBody = JSON.parse(capturedOptions.body);
      assert.ok(parsedBody.title.startsWith('[User Feedback]'));
      assert.deepStrictEqual(parsedBody.labels, ['feedback']);
      assert.ok(parsedBody.body.includes('**Submitted by:** Jane Doe'));
      assert.ok(parsedBody.body.includes('**Contact:** jane@example.co.nz'));
      assert.ok(parsedBody.body.includes('**URL Context:** `?origin=devonport&destination=cbd&transit=FERRY`'));
      assert.ok(parsedBody.body.includes('The Devonport ferry fare shows up nicely, but please add bicycle racks info!'));
    } finally {
      global.fetch = originalFetch;
    }
  });
});
