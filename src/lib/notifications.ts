import { createServerClient } from '@/lib/db';

interface CreateNotificationParams {
  wallet_address: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Accept only same-origin relative paths (no javascript:, data:, //cdn,
 * backslashes, or control characters). Used to sanitize notification
 * links and any stored URL-like metadata before client navigation.
 * Closes AUDIT_4.23.26 M-07.
 */
export function safeInternalPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return null;
  // Reject any colon before the first slash (blocks js: / data: with leading
  // whitespace that passed the slash check) and URL scheme smuggling.
  const firstColon = trimmed.indexOf(':');
  if (firstColon !== -1 && firstColon < (trimmed.indexOf('/', 1) >>> 0)) return null;
  return trimmed;
}

/**
 * Shallow-sanitize notification metadata before insert. String fields with
 * keys ending in "_url", "_href", or exactly "link"/"href" must be
 * safeInternalPath strings; anything else becomes null so a tampered
 * insert cannot produce a clickable javascript: URL on the client.
 */
function sanitizeNotificationMetadata(
  input: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const lowered = key.toLowerCase();
    const looksLikeLink =
      lowered === 'link' ||
      lowered === 'href' ||
      lowered.endsWith('_url') ||
      lowered.endsWith('_href');
    if (looksLikeLink) {
      out[key] = safeInternalPath(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Fire-and-forget notification creation. Never throws. */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const db = createServerClient();
    await db.from('notifications').insert({
      wallet_address: params.wallet_address,
      type: params.type,
      title: params.title,
      body: params.body || null,
      metadata: sanitizeNotificationMetadata(params.metadata),
    });
  } catch {
    // Fire-and-forget — don't block the parent operation
  }
}

/** Create multiple notifications at once */
export async function createNotifications(items: CreateNotificationParams[]): Promise<void> {
  try {
    const db = createServerClient();
    await db.from('notifications').insert(
      items.map(item => ({
        wallet_address: item.wallet_address,
        type: item.type,
        title: item.title,
        body: item.body || null,
        metadata: sanitizeNotificationMetadata(item.metadata),
      }))
    );
  } catch {
    // Fire-and-forget
  }
}
