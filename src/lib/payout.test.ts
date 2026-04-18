import { describe, it, expect, vi, afterEach } from 'vitest';
import { isPayoutEnabled } from './payout';

// ─── isPayoutEnabled ────────────────────────────────────────────

describe('isPayoutEnabled', () => {
  const original = process.env.REWARDS_CLAIM_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.REWARDS_CLAIM_ENABLED;
    } else {
      process.env.REWARDS_CLAIM_ENABLED = original;
    }
  });

  it('returns true when REWARDS_CLAIM_ENABLED is "true"', () => {
    process.env.REWARDS_CLAIM_ENABLED = 'true';
    expect(isPayoutEnabled()).toBe(true);
  });

  it('returns false when REWARDS_CLAIM_ENABLED is "false"', () => {
    process.env.REWARDS_CLAIM_ENABLED = 'false';
    expect(isPayoutEnabled()).toBe(false);
  });

  it('returns false when REWARDS_CLAIM_ENABLED is not set', () => {
    delete process.env.REWARDS_CLAIM_ENABLED;
    expect(isPayoutEnabled()).toBe(false);
  });

  it('returns false for other truthy-looking values', () => {
    process.env.REWARDS_CLAIM_ENABLED = '1';
    expect(isPayoutEnabled()).toBe(false);
    process.env.REWARDS_CLAIM_ENABLED = 'yes';
    expect(isPayoutEnabled()).toBe(false);
    process.env.REWARDS_CLAIM_ENABLED = 'TRUE';
    expect(isPayoutEnabled()).toBe(false);
  });
});

// ─── decodeBase58 (tested indirectly via getTreasuryKeypair) ────
// The decodeBase58 function is private, but we can validate behavior
// by testing the module's error handling.

describe('treasury key validation', () => {
  const originalKey = process.env.TREASURY_PRIVATE_KEY;
  const originalEncoding = process.env.TREASURY_KEY_ENCODING;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TREASURY_PRIVATE_KEY;
    } else {
      process.env.TREASURY_PRIVATE_KEY = originalKey;
    }
    if (originalEncoding === undefined) {
      delete process.env.TREASURY_KEY_ENCODING;
    } else {
      process.env.TREASURY_KEY_ENCODING = originalEncoding;
    }
  });

  it('rejects invalid TREASURY_KEY_ENCODING values', async () => {
    process.env.TREASURY_PRIVATE_KEY = 'somekey';
    process.env.TREASURY_KEY_ENCODING = 'hex';

    // getTreasuryKeypair is private, but it's called by executePayout
    // We test the validation indirectly via the exported executePayout
    const { executePayout } = await import('./payout');
    const result = await executePayout('11111111111111111111111111111111', 1000);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid TREASURY_KEY_ENCODING');
  });

  it('fails when TREASURY_PRIVATE_KEY is not set', async () => {
    delete process.env.TREASURY_PRIVATE_KEY;

    // Need to re-import to reset module state
    vi.resetModules();
    const { executePayout } = await import('./payout');
    const result = await executePayout('11111111111111111111111111111111', 1000);
    expect(result.success).toBe(false);
    expect(result.error).toContain('TREASURY_PRIVATE_KEY');
  });

  it('rejects negative payout amounts', async () => {
    process.env.TREASURY_PRIVATE_KEY = 'somekey';
    process.env.TREASURY_KEY_ENCODING = 'base58';

    vi.resetModules();
    const { executePayout } = await import('./payout');
    const result = await executePayout('11111111111111111111111111111111', -100);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid payout amount');
  });

  it('rejects zero payout amount', async () => {
    process.env.TREASURY_PRIVATE_KEY = 'somekey';
    process.env.TREASURY_KEY_ENCODING = 'base58';

    vi.resetModules();
    const { executePayout } = await import('./payout');
    const result = await executePayout('11111111111111111111111111111111', 0);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid payout amount');
  });

  it('rejects payout exceeding maximum', async () => {
    process.env.TREASURY_PRIVATE_KEY = 'somekey';
    process.env.TREASURY_KEY_ENCODING = 'base58';
    process.env.REWARDS_MAX_PAYOUT_LAMPORTS = '1000';

    vi.resetModules();
    const { executePayout } = await import('./payout');
    const result = await executePayout('11111111111111111111111111111111', 2000);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Payout exceeds maximum');

    delete process.env.REWARDS_MAX_PAYOUT_LAMPORTS;
  });
});
