'use client';

import { memo, useRef } from 'react';
import { useInView } from '@/hooks/useInView';

function fadeUpStyle(visible: boolean, delay = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(40px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  } as const;
}

function ScrollFadeUpImpl({
  delay = 0,
  className = '',
  children,
  tabIndex,
  role,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
  tabIndex?: number;
  role?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={className} style={fadeUpStyle(inView, delay)} tabIndex={tabIndex} role={role}>
      {children}
    </div>
  );
}

// Memoized because this component renders dozens of times across landing
// routes. Parent re-renders (e.g. the engine simulator toggling flags)
// should not re-render every fade wrapper whose props are stable.
export const ScrollFadeUp = memo(ScrollFadeUpImpl);
