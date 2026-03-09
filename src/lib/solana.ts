import { Connection, PublicKey } from '@solana/web3.js';
import { JITO_CABAL_COLLECTION_ADDRESS } from './constants';

// Verify if a wallet holds a Jito Cabal NFT
export async function verifyNFTHolder(
  walletAddress: string,
  heliusApiKey: string
): Promise<{ isHolder: boolean; mintAddress: string | null }> {
  try {
    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'nft-check',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 1000,
            displayOptions: {
              showCollectionMetadata: true,
            },
          },
        }),
      }
    );

    const data = await response.json();
    const assets = data.result?.items || [];

    // Find any asset belonging to the Jito Cabal collection
    const cabalNFT = assets.find(
      (asset: { grouping?: { group_key: string; group_value: string }[] }) =>
        asset.grouping?.some(
          (g: { group_key: string; group_value: string }) =>
            g.group_key === 'collection' &&
            g.group_value === JITO_CABAL_COLLECTION_ADDRESS
        )
    );

    return {
      isHolder: !!cabalNFT,
      mintAddress: cabalNFT?.id || null,
    };
  } catch (error) {
    console.error('Failed to verify NFT holder:', error);
    return { isHolder: false, mintAddress: null };
  }
}

// Verify a wallet signature for authentication
export function verifySignature(
  message: string,
  signature: Uint8Array,
  publicKey: PublicKey
): boolean {
  const { sign } = require('tweetnacl');
  const messageBytes = new TextEncoder().encode(message);
  return sign.detached.verify(messageBytes, signature, publicKey.toBytes());
}

// Get a Solana connection
export function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}
