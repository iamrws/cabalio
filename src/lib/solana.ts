import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { JITO_CABAL_COLLECTION_ADDRESS } from './constants';

// Verify if a wallet holds a Jito Cabal NFT
export async function verifyNFTHolder(
  walletAddress: string,
  heliusApiKey: string,
  collectionAddress: string = JITO_CABAL_COLLECTION_ADDRESS
): Promise<{ isHolder: boolean; mintAddress: string | null }> {
  if (!heliusApiKey || !collectionAddress) {
    return { isHolder: false, mintAddress: null };
  }

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
    const cabalNFT = assets.find((asset: {
      id?: string;
      grouping?: { group_key: string; group_value: string }[];
      collection?: { key?: string };
    }) => {
      const groupingMatch = asset.grouping?.some(
        (g: { group_key: string; group_value: string }) =>
          g.group_key === 'collection' && g.group_value === collectionAddress
      );
      const collectionKeyMatch = asset.collection?.key === collectionAddress;
      return groupingMatch || collectionKeyMatch;
    });

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
  const messageBytes = new TextEncoder().encode(message);
  return nacl.sign.detached.verify(messageBytes, signature, publicKey.toBytes());
}

// Get a Solana connection
export function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}
