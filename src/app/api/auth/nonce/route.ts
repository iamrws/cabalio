import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import {
  AUTH_CHALLENGE_COOKIE_NAME,
  buildSignInMessage,
  encodeChallenge,
  generateNonce,
  getAuthCookieOptions,
  getCanonicalAppUrl,
  getCanonicalDomain,
  getChainId,
  validateCsrfOrigin,
} from '@/lib/auth';
import { createServerClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

const nonceSchema = z.object({
  walletAddress: z.string().min(32).max(64),
});

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = nonceSchema.parse(body);

    try {
      // Validate base58 public key formatting early.
      new PublicKey(parsed.walletAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const nonce = generateNonce();
    const issuedAtMs = Date.now();
    const issuedAt = new Date(issuedAtMs).toISOString();
    const expiresAt = new Date(issuedAtMs + 5 * 60 * 1000).toISOString();

    let domain: string;
    let uri: string;
    try {
      domain = getCanonicalDomain();
      uri = getCanonicalAppUrl().toString();
    } catch (err) {
      console.error('Auth misconfiguration:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Authentication misconfigured' }, { status: 500 });
    }
    const chainId = getChainId();

    // C1: Store nonce in Supabase for server-side validation and single-use enforcement
    const supabase = createServerClient();

    // Rate limit: max 10 nonce requests per wallet per 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentNonces } = await supabase
      .from('auth_nonces')
      .select('id', { count: 'exact', head: true })
      .eq('wallet_address', parsed.walletAddress)
      .gte('issued_at', fiveMinAgo);

    if (recentNonces !== null && recentNonces >= 10) {
      return NextResponse.json(
        { error: 'Too many authentication requests. Please wait a few minutes.' },
        { status: 429 }
      );
    }
    const { error: insertError } = await supabase.from('auth_nonces').insert({
      nonce,
      wallet_address: parsed.walletAddress,
      used: false,
      issued_at: issuedAt,
    });

    if (insertError) {
      console.error('Failed to store auth nonce:', insertError);
      return NextResponse.json({ error: 'Authentication setup failed' }, { status: 500 });
    }

    // M4: Include wallet address in challenge cookie so it's bound to the requesting wallet.
    // H-02: Bind the signed message to domain/URI/chain-id/expiry.
    const challenge = await encodeChallenge({
      nonce,
      issuedAt,
      expiresAt,
      walletAddress: parsed.walletAddress,
      domain,
      uri,
      chainId,
    });
    const message = buildSignInMessage({
      walletAddress: parsed.walletAddress,
      nonce,
      issuedAt,
      expiresAt,
      domain,
      uri,
      chainId,
    });

    const response = NextResponse.json({ message, issuedAt, expiresAt });
    response.cookies.set(AUTH_CHALLENGE_COOKIE_NAME, challenge, {
      ...getAuthCookieOptions(60 * 5),
      maxAge: 60 * 5,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
