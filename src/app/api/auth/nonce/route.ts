import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import {
  AUTH_CHALLENGE_COOKIE_NAME,
  buildSignInMessage,
  encodeChallenge,
  generateNonce,
  getAuthCookieOptions,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

const nonceSchema = z.object({
  walletAddress: z.string().min(32).max(64),
});

export async function POST(request: NextRequest) {
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
    const issuedAt = new Date().toISOString();
    const challenge = encodeChallenge({ nonce, issuedAt });
    const message = buildSignInMessage(parsed.walletAddress, nonce, issuedAt);

    const response = NextResponse.json({ message, issuedAt });
    response.cookies.set(AUTH_CHALLENGE_COOKIE_NAME, challenge, {
      ...getAuthCookieOptions(60 * 5),
      maxAge: 60 * 5,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
