'use client';

/**
 * Shared IntersectionObserver singleton.
 *
 * Problem: creating one IntersectionObserver per `<ScrollFadeUp>` element
 * scales poorly — each observer has its own layout bookkeeping and
 * callback scheduling. Landing pages often render 20+ ScrollFadeUps.
 *
 * Solution: bucket observers by their `threshold` option (threshold is the
 * only IntersectionObserverInit value we key on in this codebase) and
 * share a single observer across every element that opts into the same
 * threshold. A Map<Element, callback> dispatches intersection entries to
 * the right consumer.
 */
export type IntersectCallback = (entry: IntersectionObserverEntry) => void;

interface SharedEntry {
  observer: IntersectionObserver;
  callbacks: Map<Element, IntersectCallback>;
}

const buckets = new Map<string, SharedEntry>();

function bucketKey(threshold: number): string {
  // Normalize to 3 decimals so 0.15 vs 0.150 don't diverge.
  return threshold.toFixed(3);
}

function getBucket(threshold: number): SharedEntry {
  const key = bucketKey(threshold);
  const existing = buckets.get(key);
  if (existing) return existing;

  const callbacks = new Map<Element, IntersectCallback>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target);
        if (cb) cb(entry);
      }
    },
    { threshold },
  );
  const entry: SharedEntry = { observer, callbacks };
  buckets.set(key, entry);
  return entry;
}

/**
 * Observe `element` with a shared IntersectionObserver. Returns an
 * unobserve function that cleans up the per-element callback and
 * disposes the underlying observer when no consumers remain.
 */
export function observe(
  element: Element,
  threshold: number,
  callback: IntersectCallback,
): () => void {
  const bucket = getBucket(threshold);
  bucket.callbacks.set(element, callback);
  bucket.observer.observe(element);

  return () => {
    const b = buckets.get(bucketKey(threshold));
    if (!b) return;
    b.callbacks.delete(element);
    b.observer.unobserve(element);
    if (b.callbacks.size === 0) {
      b.observer.disconnect();
      buckets.delete(bucketKey(threshold));
    }
  };
}
