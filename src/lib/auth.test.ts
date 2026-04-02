import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  generateNonce,
  buildSignInMessage,
  encodeChallenge,
  decodeChallenge,
  isChallengeAgeFresh,
  validateCsrfOrigin,
  getAdminWalletAllowlist,
  getAuthCookieOptions,
  AUTH_COOKIE_NAME,
  AUTH_CHALLENGE_COOKIE_NAME,
  type AuthChallenge,
} from './auth';

// Set a test secret before any tests run
beforeAll(() => {
  process.env.NEXTAUTH_SECRET = 'test-secret-for-vitest-at-least-32-chars-long!!';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Session Token Tests ────────────────────────────────────────

describe('createSessionToken / verifySessionToken', () => {
  it('creates a token that can be verified', async () => {
    const token = await createSessionToken('WaLLetAddr123', true, false);
    expect(token).toContain('.');
    const parts = token.split('.');
    expect(parts).toHaveLength(2);

    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.walletAddress).toBe('WaLLetAddr123');
    expect(payload!.isHolder).toBe(true);
    expect(payload!.role).toBe('member');
  });

  it('sets role to admin when isAdmin is true', async () => {
    const token = await createSessionToken('AdminWallet', false, true);
    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.role).toBe('admin');
    expect(payload!.isHolder).toBe(false);
  });

  it('rejects null/undefined/empty tokens', async () => {
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
  });

  it('rejects tokens without a dot separator', async () => {
    expect(await verifySessionToken('nodothere')).toBeNull();
  });

  it('rejects tokens with tampered payload', async () => {
    const token = await createSessionToken('Wallet1', true, false);
    const [, sig] = token.split('.');
    // Swap the payload portion
    const fakePayload = btoa(JSON.stringify({ walletAddress: 'EvilWallet', isHolder: true, role: 'admin', exp: 9999999999 }));
    const tampered = `${fakePayload}.${sig}`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('rejects tokens with tampered signature', async () => {
    const token = await createSessionToken('Wallet1', true, false);
    const [payload] = token.split('.');
    const tampered = `${payload}.AAAAinvalidsig`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('rejects expired tokens', async () => {
    // Override env to create a 1-second session
    const original = process.env.AUTH_SESSION_MAX_AGE_SECONDS;
    process.env.AUTH_SESSION_MAX_AGE_SECONDS = '1';

    const token = await createSessionToken('Wallet1', true, false);

    // Advance time by 2 seconds
    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 2000;

    const payload = await verifySessionToken(token);
    expect(payload).toBeNull();

    // Restore
    Date.now = realDateNow;
    process.env.AUTH_SESSION_MAX_AGE_SECONDS = original;
  });
});

// ─── Nonce Tests ────────────────────────────────────────────────

describe('generateNonce', () => {
  it('returns a non-empty string', () => {
    const nonce = generateNonce();
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('generates unique nonces', () => {
    const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
    expect(nonces.size).toBe(100);
  });
});

// ─── Sign-In Message ────────────────────────────────────────────

describe('buildSignInMessage', () => {
  it('includes wallet, nonce, and issuedAt', () => {
    const msg = buildSignInMessage('SomeWallet', 'abc123', '2025-01-01T00:00:00Z');
    expect(msg).toContain('Wallet: SomeWallet');
    expect(msg).toContain('Nonce: abc123');
    expect(msg).toContain('Issued At: 2025-01-01T00:00:00Z');
    expect(msg).toContain('Jito Cabal Authentication');
  });
});

// ─── Challenge Encode/Decode ────────────────────────────────────

describe('encodeChallenge / decodeChallenge', () => {
  it('roundtrips a challenge', async () => {
    const challenge: AuthChallenge = {
      nonce: 'test-nonce',
      issuedAt: '2025-06-01T12:00:00Z',
      walletAddress: 'ChallengeWallet',
    };

    const encoded = await encodeChallenge(challenge);
    expect(typeof encoded).toBe('string');
    expect(encoded).toContain('.');

    const decoded = await decodeChallenge(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.nonce).toBe('test-nonce');
    expect(decoded!.walletAddress).toBe('ChallengeWallet');
    expect(decoded!.issuedAt).toBe('2025-06-01T12:00:00Z');
  });

  it('returns null for undefined/empty input', async () => {
    expect(await decodeChallenge(undefined)).toBeNull();
    expect(await decodeChallenge('')).toBeNull();
  });

  it('returns null for tampered challenge', async () => {
    const challenge: AuthChallenge = {
      nonce: 'n',
      issuedAt: '2025-06-01T12:00:00Z',
      walletAddress: 'W',
    };
    const encoded = await encodeChallenge(challenge);
    const [, sig] = encoded.split('.');
    const fakePayload = btoa(JSON.stringify({ nonce: 'evil', issuedAt: '2025-06-01T12:00:00Z', walletAddress: 'Evil' }));
    const tampered = `${fakePayload}.${sig}`;
    expect(await decodeChallenge(tampered)).toBeNull();
  });

  it('returns null for malformed input', async () => {
    expect(await decodeChallenge('nodot')).toBeNull();
    expect(await decodeChallenge('a.b.c')).toBeNull();
  });
});

// ─── Challenge Freshness ────────────────────────────────────────

describe('isChallengeAgeFresh', () => {
  it('returns true for a recent timestamp', () => {
    expect(isChallengeAgeFresh(new Date().toISOString())).toBe(true);
  });

  it('returns false for a timestamp older than 5 minutes', () => {
    const old = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(isChallengeAgeFresh(old)).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(isChallengeAgeFresh('not-a-date')).toBe(false);
    expect(isChallengeAgeFresh('')).toBe(false);
  });

  it('returns true for a timestamp just under 5 minutes old', () => {
    const almostExpired = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(isChallengeAgeFresh(almostExpired)).toBe(true);
  });
});

// ─── CSRF Validation ────────────────────────────────────────────

describe('validateCsrfOrigin', () => {
  function makeRequest(headers: Record<string, string>) {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
    } as unknown as import('next/server').NextRequest;
  }

  it('returns false when no host header', () => {
    expect(validateCsrfOrigin(makeRequest({}))).toBe(false);
  });

  it('returns false when no origin and no referer', () => {
    expect(validateCsrfOrigin(makeRequest({ host: 'example.com' }))).toBe(false);
  });

  it('accepts matching origin', () => {
    expect(
      validateCsrfOrigin(
        makeRequest({ host: 'example.com', origin: 'https://example.com' })
      )
    ).toBe(true);
  });

  it('rejects mismatched origin', () => {
    expect(
      validateCsrfOrigin(
        makeRequest({ host: 'example.com', origin: 'https://evil.com' })
      )
    ).toBe(false);
  });

  it('accepts matching referer when origin is absent', () => {
    expect(
      validateCsrfOrigin(
        makeRequest({ host: 'example.com', referer: 'https://example.com/page' })
      )
    ).toBe(true);
  });

  it('rejects mismatched referer', () => {
    expect(
      validateCsrfOrigin(
        makeRequest({ host: 'example.com', referer: 'https://evil.com/page' })
      )
    ).toBe(false);
  });

  it('accepts origin matching NEXT_PUBLIC_APP_URL', () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.jitocabal.com';

    expect(
      validateCsrfOrigin(
        makeRequest({
          host: 'localhost:3000',
          origin: 'https://app.jitocabal.com',
        })
      )
    ).toBe(true);

    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it('returns false for invalid origin URL', () => {
    expect(
      validateCsrfOrigin(
        makeRequest({ host: 'example.com', origin: 'not-a-url' })
      )
    ).toBe(false);
  });
});

// ─── Admin Wallet Allowlist ─────────────────────────────────────

describe('getAdminWalletAllowlist', () => {
  it('returns empty set when env var is not set', () => {
    const original = process.env.ADMIN_WALLET_ADDRESSES;
    delete process.env.ADMIN_WALLET_ADDRESSES;

    const result = getAdminWalletAllowlist();
    expect(result.size).toBe(0);

    process.env.ADMIN_WALLET_ADDRESSES = original;
  });

  it('parses comma-separated wallet addresses', () => {
    const original = process.env.ADMIN_WALLET_ADDRESSES;
    process.env.ADMIN_WALLET_ADDRESSES = 'wallet1, wallet2 , wallet3';

    const result = getAdminWalletAllowlist();
    expect(result.size).toBe(3);
    expect(result.has('wallet1')).toBe(true);
    expect(result.has('wallet2')).toBe(true);
    expect(result.has('wallet3')).toBe(true);

    process.env.ADMIN_WALLET_ADDRESSES = original;
  });

  it('filters empty entries from trailing commas', () => {
    const original = process.env.ADMIN_WALLET_ADDRESSES;
    process.env.ADMIN_WALLET_ADDRESSES = 'wallet1,,wallet2,';

    const result = getAdminWalletAllowlist();
    expect(result.size).toBe(2);

    process.env.ADMIN_WALLET_ADDRESSES = original;
  });
});

// ─── Cookie Options ─────────────────────────────────────────────

describe('getAuthCookieOptions', () => {
  it('returns httpOnly, strict sameSite, and path /', () => {
    const opts = getAuthCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('strict');
    expect(opts.path).toBe('/');
  });

  it('uses provided maxAge when given', () => {
    const opts = getAuthCookieOptions(3600);
    expect(opts.maxAge).toBe(3600);
  });

  it('uses default maxAge when not provided', () => {
    const opts = getAuthCookieOptions();
    expect(opts.maxAge).toBe(86400); // 24 hours default
  });

  it('sets secure to false in non-production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const opts = getAuthCookieOptions();
    expect(opts.secure).toBe(false);
    process.env.NODE_ENV = original;
  });
});

// ─── Constants ──────────────────────────────────────────────────

describe('auth constants', () => {
  it('exports expected cookie names', () => {
    expect(AUTH_COOKIE_NAME).toBe('jc_session');
    expect(AUTH_CHALLENGE_COOKIE_NAME).toBe('jc_auth_challenge');
  });
});
