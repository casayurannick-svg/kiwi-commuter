import assert from 'node:assert';
import { describe, it } from 'node:test';
import handler from '../index';
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock helper to create mock NextApiRequest and NextApiResponse
function createMockReqRes(method: string = 'POST', body: Record<string, unknown> = {}) {
  const req = {
    method,
    body,
    query: {},
    headers: {},
  } as unknown as NextApiRequest;

  let statusCode = 200;
  let responseData: unknown = null;
  const headers: Record<string, string | string[]> = {};

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      headers[name] = value;
      return res;
    },
    json(data: unknown) {
      responseData = data;
      return res;
    },
    get statusCode() {
      return statusCode;
    },
    get responseData() {
      return responseData;
    },
    get headers() {
      return headers;
    },
  } as unknown as NextApiResponse & {
    statusCode: number;
    responseData: unknown;
    headers: Record<string, string | string[]>;
  };

  return { req, res };
}

interface MockResponse {
  statusCode: number;
  responseData: unknown;
  headers: Record<string, string | string[]>;
}

describe('src/pages/api/preferences/index.ts - User Preferences API Endpoint', () => {
  it('rejects non-POST requests with 405 Method Not Allowed', async () => {
    const { req, res } = createMockReqRes('GET');
    await handler(req, res);
    const mockRes = res as unknown as MockResponse;
    assert.strictEqual(mockRes.statusCode, 405);
    assert.deepStrictEqual(mockRes.responseData, {
      success: false,
      error: 'Method not allowed',
    });
    assert.deepStrictEqual(mockRes.headers['Allow'], ['POST']);
  });

  it('rejects missing or empty sessionId with 400 Bad Request', async () => {
    const { req, res } = createMockReqRes('POST', {
      daysInOffice: 3,
      hourlyWage: 45,
    });
    await handler(req, res);
    const mockRes = res as unknown as MockResponse;
    assert.strictEqual(mockRes.statusCode, 400);
    assert.deepStrictEqual(mockRes.responseData, {
      success: false,
      error: 'sessionId is required',
    });
  });

  it('rejects whitespace-only sessionId with 400 Bad Request', async () => {
    const { req, res } = createMockReqRes('POST', {
      sessionId: '   ',
      daysInOffice: 4,
    });
    await handler(req, res);
    const mockRes = res as unknown as MockResponse;
    assert.strictEqual(mockRes.statusCode, 400);
    assert.deepStrictEqual(mockRes.responseData, {
      success: false,
      error: 'sessionId is required',
    });
  });
});
