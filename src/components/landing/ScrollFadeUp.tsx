'use client';

import { useRef } from 'react';
import { useInView } from '@/hooks/useInView';

function fadeUpStyle(visible: boolean, delay = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(40px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  } as const;
}

export function ScrollFadeUp({
  delay = 0,
  className = '',
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={className} style={fadeUpStyle(inView, delay)}>
      {children}
    </div>
  );
}
