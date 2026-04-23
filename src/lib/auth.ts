import type { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'jc_session';
export const AUTH_CHALLENGE_COOKIE_NAME = 'jc_auth_challenge';
// Security note: 24h is long for financial operations. Consider reducing to 4h
// and implementing refresh token rotation. See security-audit-owasp.json FINDING-A07-001.
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export type SessionRole = 'member' | 'admin';

export interface SessionPayload {
  walletAddress: string;
  isHolder: boolean;
  role: SessionRole;
  /**
   * Cached admin flag. Set at session-creation time to avoid a DB round-trip
   * on every admin endpoint. May be absent on older tokens; callers should
   * fall back to a DB lookup when undefined.
   */
  isAdmin?: boolean;
  exp: number;
}

export interface AuthChallenge {
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  walletAddress: string;
  domain: string;
  uri: string;
  chainId: string;
}

export interface SignInMessageFields {
  walletAddress: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  domain: string;
  uri: string;
  chainId: string;
}

const DEFAULT_CHAIN_ID = 'solana:mainnet';
const DEV_APP_URL_FALLBACK = 'http://localhost:3000';

/**
 * Canonical app URL used for domain binding in the sign-in message and for
 * CSRF origin validation. Set NEXT_PUBLIC_APP_URL in every non-dev
 * environment. In production we refuse to fall back to the request host
 * because that is attacker-controlled.
 */
export function getCanonicalAppUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL || '';
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // fall through to default handling below
    }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_APP_URL must be configured in production for domain-bound auth'
    );
  }
  return new URL(DEV_APP_URL_FALLBACK);
}

export function getCanonicalDomain(): string {
  return getCanonicalAppUrl().host;
}

export function getChainId(): string {
  return process.env.NEXT_PUBLIC_CHAIN_ID || DEFAULT_CHAIN_ID;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function getSessionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET (or AUTH_SECRET) is required for session signing');
  }
  return secret;
}

async function signValue(value: string): Promise<Uint8Array> {
  const secret = getSessionSecret();
  const secretBytes = new TextEncoder().encode(secret);
  const valueBytes = new TextEncoder().encode(value);
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, valueBytes);
  return new Uint8Array(signature);
}

function getSessionMaxAgeSeconds(): number {
  const configured = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS || DEFAULT_SESSION_MAX_AGE_SECONDS);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_SESSION_MAX_AGE_SECONDS;
  return Math.floor(configured);
}

export async function createSessionToken(
  walletAddress: string,
  isHolder: boolean,
  isAdmin: boolean
): Promise<string> {
  const payload: SessionPayload = {
    walletAddress,
    isHolder,
    role: isAdmin ? 'admin' : 'member',
    isAdmin,
    exp: Math.floor(Date.now() / 1000) + getSessionMaxAgeSeconds(),
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = base64UrlEncode(payloadBytes);
  const signature = await signValue(payloadB64);
  const signatureB64 = base64UrlEncode(signature);
  return `${payloadB64}.${signatureB64}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [payloadB64, signatureB64] = token.split('.');
  if (!payloadB64 || !signatureB64) return null;

  try {
    const expectedSig = await signValue(payloadB64);
    const providedSig = base64UrlDecode(signatureB64);
    if (!timingSafeEqual(expectedSig, providedSig)) return null;

    const payloadBytes = base64UrlDecode(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload;

    if (!payload.walletAddress || typeof payload.isHolder !== 'boolean' || !payload.role || !payload.exp) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getAdminWalletAllowlist(): Set<string> {
  const raw = process.env.ADMIN_WALLET_ADDRESSES || '';
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

/**
 * Check admin status from both the env-based allowlist and the Supabase admin_wallets table.
 * The DB lookup allows admins to be added/revoked without a redeploy.
 */
export async function isAdminWallet(walletAddress: string): Promise<boolean> {
  // Fast path: check env-based allowlist first
  if (getAdminWalletAllowlist().has(walletAddress)) {
    return true;
  }

  // Fallback: check the admin_wallets table in Supabase
  try {
    const { createServerClient } = await import('@/lib/db');
    const supabase = createServerClient();
    const { data } = await supabase
      .from('admin_wallets')
      .select('wallet_address')
      .eq('wallet_address', walletAddress)
      .eq('active', true)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Admin wallet DB lookup failed, falling back to env-only:', error);
    return false;
  }
}

/**
 * Re-verify admin status from the database/env. Prefers the cached `isAdmin`
 * flag on the session to skip a DB round-trip, but still falls back to the env
 * allowlist + admin_wallets table when the session is old (no `isAdmin` claim)
 * or the caller doesn't pass it. Use on admin endpoints instead of the token
 * role claim directly.
 */
export async function verifyAdminStatus(
  walletAddress: string,
  session?: SessionPayload | null
): Promise<boolean> {
  // Fast path: session already encodes admin status from sign-in time.
  // Older sessions may not have the claim — fall through to env+DB in that case.
  if (session && typeof session.isAdmin === 'boolean') {
    return session.isAdmin;
  }

  // Check environment allowlist first (fast path)
  const envAdmins = (process.env.ADMIN_WALLET_ADDRESSES || '').split(',').map(w => w.trim()).filter(Boolean);
  if (envAdmins.includes(walletAddress)) return true;

  // Check database
  const { createServerClient } = await import('./db');
  const supabase = createServerClient();
  const { data } = await supabase
    .from('admin_wallets')
    .select('wallet_address')
    .eq('wallet_address', walletAddress)
    .eq('active', true)
    .maybeSingle();

  return !!data;
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * Construct the SIWS-style sign-in message the wallet signs. Includes the
 * canonical domain, URI, chain ID, nonce, and an explicit issue/expire
 * window so a relayed signature cannot be replayed against a different
 * host (see AUDIT_4.23.26 H-02).
 */
export function buildSignInMessage(fields: SignInMessageFields): string {
  return [
    `${fields.domain} wants you to sign in with your Solana account:`,
    fields.walletAddress,
    '',
    'Sign in to Jito Cabal and verify holder-only access.',
    '',
    `URI: ${fields.uri}`,
    'Version: 1',
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expiresAt}`,
  ].join('\n');
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  const secretBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

export async function encodeChallenge(challenge: AuthChallenge): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify(challenge));
  const payloadB64 = base64UrlEncode(payload);
  const key = await getSigningKey();
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, payload.buffer as ArrayBuffer));
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

export async function decodeChallenge(raw: string | undefined): Promise<AuthChallenge | null> {
  if (!raw) return null;
  try {
    const parts = raw.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    const payload = base64UrlDecode(payloadB64);
    const sig = base64UrlDecode(sigB64);
    const key = await getSigningKey();
    const expectedSig = new Uint8Array(await crypto.subtle.sign('HMAC', key, payload.buffer as ArrayBuffer));
    if (!timingSafeEqual(expectedSig, sig)) return null;
    const decoded = new TextDecoder().decode(payload);
    const challenge = JSON.parse(decoded) as Partial<AuthChallenge>;
    if (
      !challenge.nonce ||
      !challenge.issuedAt ||
      !challenge.walletAddress ||
      !challenge.expiresAt ||
      !challenge.domain ||
      !challenge.uri ||
      !challenge.chainId
    ) {
      return null;
    }
    return challenge as AuthChallenge;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds ?? getSessionMaxAgeSeconds(),
  };
}

const NONCE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Validate that the challenge issuedAt timestamp is not older than 5 minutes.
 * Returns true if the challenge is still fresh, false if expired.
 */
export function isChallengeAgeFresh(issuedAt: string): boolean {
  const issuedTime = new Date(issuedAt).getTime();
  if (Number.isNaN(issuedTime)) return false;
  return Date.now() - issuedTime < NONCE_MAX_AGE_MS;
}

/**
 * Validate the Origin or Referer header against the canonical app URL.
 * Prevents CSRF from cross-origin submissions. The request's own `Host`
 * header is attacker-controlled and is ONLY used as a fallback outside of
 * production (so the dev server keeps working on arbitrary localhost
 * ports). See AUDIT_4.23.26 N-12.
 */
export function validateCsrfOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  const forwardedHost = request.headers.get('x-forwarded-host');

  const allowedHosts = new Set<string>();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowedHosts.add(new URL(appUrl).host);
    } catch {
      // invalid env var -- ignored, but fail-closed below if this was our
      // only hope of a trusted host.
    }
  }

  // Vercel sets x-forwarded-host to the real custom domain. Unlike Host,
  // this header is set by Vercel's own edge infrastructure, not the client,
  // so it is safe to trust in production.
  if (forwardedHost) {
    allowedHosts.add(forwardedHost);
  }

  if (process.env.NODE_ENV !== 'production' && host) {
    // In dev, trust the request host so `next dev` on random ports works.
    // Production never takes this branch -- host is attacker-controlled
    // via spoofing or request smuggling.
    allowedHosts.add(host);
  }

  if (allowedHosts.size === 0) return false;

  if (origin) {
    try {
      return allowedHosts.has(new URL(origin).host);
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      return allowedHosts.has(new URL(referer).host);
    } catch {
      return false;
    }
  }

  return false;
}
