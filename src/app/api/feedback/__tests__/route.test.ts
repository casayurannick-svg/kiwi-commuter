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
      assert.strictEqual(data.issueUrl, undefined, 'issue URL must not be returned');

      // Verify captured GitHub API call
      assert.strictEqual(capturedUrl, 'https://api.github.com/repos/casayurannick-svg/kiwi-commuter/issues');
      assert.strictEqual(capturedOptions.method, 'POST');
      assert.strictEqual(capturedOptions.headers.Authorization, 'Bearer test_token_xyz');

      const parsedBody = JSON.parse(capturedOptions.body);
      assert.ok(parsedBody.title.startsWith('[User Feedback]'));
      assert.deepStrictEqual(parsedBody.labels, ['feedback']);
      // KC-001: no GITHUB_REPOSITORY → public repo → anonymous, contact never published
      assert.ok(parsedBody.body.includes('**Submitted by:** Anonymous'));
      assert.ok(!parsedBody.body.includes('Jane Doe'));
      assert.ok(!parsedBody.body.includes('jane@example.co.nz'));
      assert.ok(!parsedBody.body.includes('**Contact:**'));
      assert.ok(parsedBody.body.includes('**URL Context:** `?origin=devonport&destination=cbd&transit=FERRY`'));
      assert.ok(parsedBody.body.includes('The Devonport ferry fare shows up nicely, but please add bicycle racks info!'));
    } finally {
      global.fetch = originalFetch;
    }
  });

  describe('KC-001 privacy and limits', () => {
    const PRIVATE = 'test-owner/kiwi-commuter-feedback';
    const payload = {
      name: 'Jane Doe',
      contact: 'jane@example.co.nz',
      message: 'Hi @someone see https://example.com please',
    };

    async function submit(body: unknown, repoEnv?: string) {
      const originalFetch = global.fetch;
      const origRepo = process.env.GITHUB_REPOSITORY;
      const calls: { url: string; body: { title: string; body: string } }[] = [];
      try {
        process.env.GITHUB_TOKEN = 'test_token_xyz';
        if (repoEnv === undefined) delete process.env.GITHUB_REPOSITORY;
        else process.env.GITHUB_REPOSITORY = repoEnv;
        global.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
          calls.push({ url: String(url), body: JSON.parse(String(options?.body)) });
          return new Response(JSON.stringify({ number: 7 }), { status: 201 });
        }) as typeof fetch;
        const res = await POST(
          new Request('http://localhost/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        );
        return { res, calls };
      } finally {
        global.fetch = originalFetch;
        if (origRepo === undefined) delete process.env.GITHUB_REPOSITORY;
        else process.env.GITHUB_REPOSITORY = origRepo;
      }
    }

    it('includes name and contact only for a configured private repo', async () => {
      const { res, calls } = await submit(payload, PRIVATE);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(calls[0].url, `https://api.github.com/repos/${PRIVATE}/issues`);
      assert.ok(calls[0].body.body.includes('**Submitted by:** Jane Doe'));
      assert.ok(calls[0].body.body.includes('**Contact:** jane@\u200Bexample.co.nz'));
    });

    it('omits name and contact when GITHUB_REPOSITORY points at the public app repo', async () => {
      const { calls } = await submit(payload, 'casayurannick-svg/kiwi-commuter');
      assert.ok(!calls[0].body.body.includes('jane@'));
      assert.ok(!calls[0].body.body.includes('Jane Doe'));
    });

    it('omits name and contact when GITHUB_REPOSITORY is malformed', async () => {
      const { calls } = await submit(payload, 'not a repo');
      assert.ok(calls[0].url.endsWith('/casayurannick-svg/kiwi-commuter/issues'));
      assert.ok(!calls[0].body.body.includes('jane@'));
    });

    it('strips @mentions and links from the title and defuses mentions in the body', async () => {
      const { calls } = await submit(payload, PRIVATE);
      assert.ok(!calls[0].body.title.includes('@'));
      assert.ok(!calls[0].body.title.includes('http'));
      assert.ok(!/@someone/.test(calls[0].body.body));
    });

    for (const [field, max] of [['message', 2000], ['name', 80], ['contact', 120], ['urlContext', 300]] as const) {
      it(`rejects ${field} over ${max} characters with 400 and creates no issue`, async () => {
        const { res, calls } = await submit({ message: 'ok', [field]: 'x'.repeat(max + 1) }, PRIVATE);
        assert.strictEqual(res.status, 400);
        assert.strictEqual(calls.length, 0);
      });
    }

    it('rejects non-text fields with 400', async () => {
      const { res, calls } = await submit({ message: 'ok', contact: 12345 }, PRIVATE);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(calls.length, 0);
    });

    it('honeypot filled → 200 and no issue created', async () => {
      const { res, calls } = await submit({ ...payload, website: 'http://spam.example' }, PRIVATE);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(calls.length, 0);
    });
  });
});
