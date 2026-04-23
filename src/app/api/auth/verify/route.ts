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
  getCanonicalDomain,
  getChainId,
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

    // C1: Check nonce in database and mark as used atomically
    const supabase = createServerClient();

    // Rate limit: max 5 verify attempts per wallet per 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabase
      .from('auth_nonces')
      .select('id', { count: 'exact', head: true })
      .eq('wallet_address', parsed.walletAddress)
      .gte('issued_at', fiveMinAgo);

    if (recentAttempts !== null && recentAttempts >= 15) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please wait.' },
        { status: 429 }
      );
    }

    const challenge = await decodeChallenge(request.cookies.get(AUTH_CHALLENGE_COOKIE_NAME)?.value);
    if (!challenge) {
      return NextResponse.json({ error: 'Authentication challenge expired' }, { status: 401 });
    }

    // C1: Validate issuedAt age server-side (reject > 5 min)
    if (!isChallengeAgeFresh(challenge.issuedAt)) {
      // Log failed auth attempt (fire and forget)
      supabase.from('audit_logs').insert({
        action: 'auth_failed',
        actor_wallet: parsed.walletAddress,
        target_wallet: parsed.walletAddress,
        details: { reason: 'expired_challenge' },
        created_at: new Date().toISOString(),
      }).then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));
      return NextResponse.json({ error: 'Authentication challenge expired' }, { status: 401 });
    }

    // M4: Validate that the wallet address matches the one bound to the challenge
    if (challenge.walletAddress !== parsed.walletAddress) {
      // Log failed auth attempt (fire and forget)
      supabase.from('audit_logs').insert({
        action: 'auth_failed',
        actor_wallet: parsed.walletAddress,
        target_wallet: parsed.walletAddress,
        details: { reason: 'wallet_mismatch' },
        created_at: new Date().toISOString(),
      }).then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));
      return NextResponse.json({ error: 'Wallet address does not match challenge' }, { status: 401 });
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(parsed.walletAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // C1: Atomically mark nonce as used — prevents TOCTOU race condition
    const { data: markedNonce, error: markUsedError } = await supabase
      .from('auth_nonces')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('nonce', challenge.nonce)
      .eq('wallet_address', parsed.walletAddress)
      .eq('used', false)
      .select('nonce')
      .maybeSingle();

    if (markUsedError || !markedNonce) {
      // Log failed auth attempt (fire and forget)
      supabase.from('audit_logs').insert({
        action: 'auth_failed',
        actor_wallet: parsed.walletAddress,
        target_wallet: parsed.walletAddress,
        details: { reason: 'nonce_already_consumed' },
        created_at: new Date().toISOString(),
      }).then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));
      return NextResponse.json({ error: 'Nonce already consumed' }, { status: 401 });
    }

    // H-02: Reject sessions signed for a different domain or chain. The
    // challenge cookie captured these at nonce-issue time; refuse if the
    // server's current config disagrees (stale-deploy / misconfig).
    const expectedDomain = getCanonicalDomain();
    const expectedChain = getChainId();
    if (challenge.domain !== expectedDomain || challenge.chainId !== expectedChain) {
      supabase
        .from('audit_logs')
        .insert({
          action: 'auth_failed',
          actor_wallet: parsed.walletAddress,
          target_wallet: parsed.walletAddress,
          details: {
            reason: 'domain_or_chain_mismatch',
            expected_domain: expectedDomain,
            challenge_domain: challenge.domain,
            expected_chain: expectedChain,
            challenge_chain: challenge.chainId,
          },
          created_at: new Date().toISOString(),
        })
        .then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));
      return NextResponse.json({ error: 'Authentication domain mismatch' }, { status: 401 });
    }

    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Authentication challenge expired' }, { status: 401 });
    }

    const message = buildSignInMessage({
      walletAddress: parsed.walletAddress,
      nonce: challenge.nonce,
      issuedAt: challenge.issuedAt,
      expiresAt: challenge.expiresAt,
      domain: challenge.domain,
      uri: challenge.uri,
      chainId: challenge.chainId,
    });
    const signatureBytes = base64ToBytes(parsed.signature);
    const isSignatureValid = verifySignature(message, signatureBytes, publicKey);

    if (!isSignatureValid) {
      // Log failed auth attempt (fire and forget)
      supabase.from('audit_logs').insert({
        action: 'auth_failed',
        actor_wallet: parsed.walletAddress,
        target_wallet: parsed.walletAddress,
        details: { reason: 'invalid_signature' },
        created_at: new Date().toISOString(),
      }).then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // N-05 / H-08: cut NFT holder cache TTL to 5 min so a transferred-out
    // holder loses claim/vote access within one session refresh instead of
    // an hour.
    const NFT_CACHE_TTL_MS = 5 * 60 * 1000;
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
      // Log failed auth attempt (fire and forget)
      supabase.from('audit_logs').insert({
        action: 'auth_failed',
        actor_wallet: parsed.walletAddress,
        target_wallet: parsed.walletAddress,
        details: { reason: 'not_nft_holder' },
        created_at: new Date().toISOString(),
      }).then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));
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

    // Log successful authentication
    const heliusApiKey = process.env.HELIUS_API_KEY || '';
    await supabase.from('audit_logs').insert({
      action: 'auth_login',
      actor_wallet: parsed.walletAddress,
      target_wallet: parsed.walletAddress,
      details: {
        is_holder: isHolder,
        is_admin: isAdmin,
        nft_verified: !!heliusApiKey,
      },
      created_at: new Date().toISOString(),
    }).then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));

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
