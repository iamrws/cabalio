/**
 * Vote ticket signing for /api/game. The `/api/game/shorts` endpoint issues
 * a short-lived HMAC ticket per served video. `/api/game/vote` refuses
 * votes unless the caller presents a valid ticket that binds the
 * videoId + wallet + expiry. Closes AUDIT_4.23.26 M-05.
 */

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

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
  if (!secret) throw new Error('NEXTAUTH_SECRET required for game ticket signing');
  return secret;
}

const TICKET_TTL_MS = 30 * 60 * 1000; // 30 min

async function hmac(value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  );
}

export async function issueVoteTicket(
  videoId: string,
  walletAddress: string
): Promise<string> {
  const payload = {
    v: videoId,
    w: walletAddress,
    e: Date.now() + TICKET_TTL_MS,
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sigB64 = base64UrlEncode(await hmac(payloadB64));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyVoteTicket(
  ticket: string,
  videoId: string,
  walletAddress: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const parts = ticket.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [payloadB64, sigB64] = parts;

  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const expected = await hmac(payloadB64);
  if (!timingSafeEqual(expected, sigBytes)) {
    return { ok: false, reason: 'bad_signature' };
  }

  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as {
      v?: string;
      w?: string;
      e?: number;
    };
    if (!decoded.v || !decoded.w || !decoded.e) return { ok: false, reason: 'missing_fields' };
    if (decoded.v !== videoId) return { ok: false, reason: 'video_mismatch' };
    if (decoded.w !== walletAddress) return { ok: false, reason: 'wallet_mismatch' };
    if (decoded.e <= Date.now()) return { ok: false, reason: 'expired' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}
