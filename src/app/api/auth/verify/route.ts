import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import {
  AUTH_CHALLENGE_COOKIE_NAME,
  AUTH_COOKIE_NAME,
  buildSignInMessage,
  createSessionToken,
  decodeChallenge,
  getAuthCookieOptions,
  isAdminWallet,
  isChallengeAgeFresh,
  validateCsrfOrigin,
} from '@/lib/auth';
import { createServerClient } from '@/lib/db';
import { verifyNFTHolder, verifySignature } from '@/lib/solana';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
  walletAddress: z.string().min(32).max(64),
  signature: z.string().min(20),
});

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function POST(request: NextRequest) {
  // M2: CSRF origin validation
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = verifySchema.parse(body);

    const challenge = decodeChallenge(request.cookies.get(AUTH_CHALLENGE_COOKIE_NAME)?.value);
    if (!challenge) {
      return NextResponse.json({ error: 'Authentication challenge expired' }, { status: 401 });
    }

    // C1: Validate issuedAt age server-side (reject > 5 min)
    if (!isChallengeAgeFresh(challenge.issuedAt)) {
      return NextResponse.json({ error: 'Authentication challenge expired' }, { status: 401 });
    }

    // M4: Validate that the wallet address matches the one bound to the challenge
    if (challenge.walletAddress !== parsed.walletAddress) {
      return NextResponse.json({ error: 'Wallet address does not match challenge' }, { status: 401 });
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(parsed.walletAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // C1: Check nonce in database and mark as used atomically
    const supabase = createServerClient();

    const { data: nonceRow, error: nonceError } = await supabase
      .from('auth_nonces')
      .select('nonce, wallet_address, used, issued_at')
      .eq('nonce', challenge.nonce)
      .eq('wallet_address', parsed.walletAddress)
      .maybeSingle();

    if (nonceError || !nonceRow) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
    }

    if (nonceRow.used) {
      return NextResponse.json({ error: 'Nonce has already been used' }, { status: 401 });
    }

    // Validate nonce age server-side from DB record
    const nonceIssuedAt = new Date(nonceRow.issued_at).getTime();
    if (Number.isNaN(nonceIssuedAt) || Date.now() - nonceIssuedAt > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Nonce has expired' }, { status: 401 });
    }

    // Mark nonce as used immediately before proceeding
    const { error: markUsedError } = await supabase
      .from('auth_nonces')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('nonce', challenge.nonce)
      .eq('used', false);

    if (markUsedError) {
      return NextResponse.json({ error: 'Failed to validate nonce' }, { status: 500 });
    }

    const message = buildSignInMessage(parsed.walletAddress, challenge.nonce, challenge.issuedAt);
    const signatureBytes = base64ToBytes(parsed.signature);
    const isSignatureValid = verifySignature(message, signatureBytes, publicKey);

    if (!isSignatureValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // M3 fix: Reduce NFT holder cache TTL to 1 hour. Re-verify only when cache expired.
    const NFT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
    let isHolder = false;
    let mintAddress: string | null = null;

    const { data: existingUser } = await supabase
      .from('users')
      .select('is_holder, nft_mint_address, holder_verified_at')
      .eq('wallet_address', parsed.walletAddress)
      .maybeSingle();

    const cacheStillValid =
      existingUser?.is_holder &&
      existingUser?.holder_verified_at &&
      (Date.now() - new Date(existingUser.holder_verified_at).getTime()) < NFT_CACHE_TTL_MS;

    if (cacheStillValid) {
      isHolder = true;
      mintAddress = existingUser.nft_mint_address;
    } else {
      const heliusApiKey = process.env.HELIUS_API_KEY || '';
      const holderCheck = await verifyNFTHolder(parsed.walletAddress, heliusApiKey);
      isHolder = holderCheck.isHolder;
      mintAddress = holderCheck.mintAddress;
    }

    if (!isHolder) {
      // Invalidate cached holder status when verification fails
      if (existingUser?.is_holder) {
        await supabase
          .from('users')
          .update({ is_holder: false, holder_verified_at: now, updated_at: now })
          .eq('wallet_address', parsed.walletAddress);
      }
      return NextResponse.json(
        { error: 'Wallet does not hold a Jito Cabal NFT' },
        { status: 403 }
      );
    }

    await supabase.from('users').upsert(
      {
        wallet_address: parsed.walletAddress,
        is_holder: true,
        nft_mint_address: mintAddress,
        holder_verified_at: now,
        updated_at: now,
      },
      { onConflict: 'wallet_address' }
    );

    // M7: isAdminWallet now checks both env and DB
    const isAdmin = await isAdminWallet(parsed.walletAddress);
    const token = await createSessionToken(parsed.walletAddress, true, isAdmin);

    const response = NextResponse.json({
      session: {
        walletAddress: parsed.walletAddress,
        isHolder: true,
        role: isAdmin ? 'admin' : 'member',
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    response.cookies.set(AUTH_CHALLENGE_COOKIE_NAME, '', {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Auth verification error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
