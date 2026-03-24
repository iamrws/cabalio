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
  try {
    const body = await request.json();
    const parsed = verifySchema.parse(body);

    const challenge = decodeChallenge(request.cookies.get(AUTH_CHALLENGE_COOKIE_NAME)?.value);
    if (!challenge) {
      return NextResponse.json({ error: 'Authentication challenge expired' }, { status: 401 });
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(parsed.walletAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const message = buildSignInMessage(parsed.walletAddress, challenge.nonce, challenge.issuedAt);
    const signatureBytes = base64ToBytes(parsed.signature);
    const isSignatureValid = verifySignature(message, signatureBytes, publicKey);

    if (!isSignatureValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const heliusApiKey = process.env.HELIUS_API_KEY || '';
    const holderCheck = await verifyNFTHolder(parsed.walletAddress, heliusApiKey);
    if (!holderCheck.isHolder) {
      return NextResponse.json(
        { error: 'Wallet does not hold a Jito Cabal NFT' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    await supabase.from('users').upsert(
      {
        wallet_address: parsed.walletAddress,
        is_holder: true,
        nft_mint_address: holderCheck.mintAddress,
        holder_verified_at: now,
        updated_at: now,
      },
      { onConflict: 'wallet_address' }
    );

    const isAdmin = isAdminWallet(parsed.walletAddress);
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


