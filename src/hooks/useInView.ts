'use client';
import { useEffect, useState } from 'react';
import type React from 'react';

/** Intersection Observer hook — triggers once when element enters viewport */
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
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, threshold]);

  return inView;
}
