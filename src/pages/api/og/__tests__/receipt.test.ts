import assert from 'node:assert';
import { describe, it } from 'node:test';
import handler from '../receipt';
import { NextRequest } from 'next/server';

describe('src/pages/api/og/receipt.tsx - OG Receipt Edge Route', () => {
  it('successfully returns a 200 Response with image/png content-type for valid query parameters', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/og/receipt?days=5&transport=12.5&parking=20&coffee=5&lunch=15'
    );
    const res = await handler(req);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
  });

  it('handles default/missing query parameters gracefully with 200 status', async () => {
    const req = new NextRequest('http://localhost:3000/api/og/receipt');
    const res = await handler(req);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
  });

  it('handles negative or invalid number query parameters by falling back to non-negative defaults', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/og/receipt?days=-2&transport=invalid&parking=-50'
    );
    const res = await handler(req);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
  });
});
