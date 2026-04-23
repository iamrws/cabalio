'use client';
import { useEffect, useState } from 'react';
import type React from 'react';
import { observe } from './sharedObserver';

/** Intersection Observer hook — triggers once when element enters viewport.
 *
 * Uses a process-wide SHARED IntersectionObserver (bucketed by threshold)
 * so mounting many ScrollFadeUp subscribers doesn't spin up one observer
 * per element. Hook API is identical to the previous per-element version.
 */
export function useInView(
  ref: React.RefObject<HTMLElement | null>,
  opts?: { threshold?: number; once?: boolean },
) {
  const [inView, setInView] = useState(false);
  const once = opts?.once ?? true;
  const threshold = opts?.threshold ?? 0.15;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let disposed = false;
    const unobserve = observe(el, threshold, (entry) => {
      if (disposed) return;
      if (entry.isIntersecting) {
        setInView(true);
        if (once) {
          disposed = true;
          unobserve();
        }
      }
    });

    return () => {
      disposed = true;
      unobserve();
    };
  }, [ref, once, threshold]);

  return inView;
}
