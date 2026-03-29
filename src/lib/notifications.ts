import { createServerClient } from '@/lib/db';

interface CreateNotificationParams {
  wallet_address: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
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
      metadata: params.metadata || {},
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
        metadata: item.metadata || {},
      }))
    );
  } catch {
    // Fire-and-forget
  }
}
