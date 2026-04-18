'use client';

import { KeyboardEvent } from 'react';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  /** @deprecated No longer renders glow effects. Kept for backwards compatibility. */
  glowColor?: 'cyan' | 'purple' | 'green' | 'orange' | 'gold';
  variant?: 'default' | 'elevated' | 'dark' | 'accent';
  accent?: string;
  hover?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-bg-surface border border-border-default shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
  elevated: 'bg-bg-surface border border-border-strong shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
  dark: 'bg-bg-base border border-border-subtle text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
  accent: 'bg-bg-surface border border-border-default shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
};

export default function NeonCard({
  children,
  className = '',
  variant = 'default',
  accent,
  hover = true,
  onClick,
}: NeonCardProps) {
  const isInteractive = !!onClick;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={`
        rounded-2xl ${variantStyles[variant]}
        ${hover ? 'transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_16px_rgba(212,168,83,0.04)]' : ''}
        ${isInteractive ? 'cursor-pointer active:scale-[0.99] active:shadow-[0_2px_8px_rgba(0,0,0,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]' : ''}
        ${className}
      `}
      style={accent ? { borderLeftWidth: '3px', borderLeftColor: accent } : undefined}
    >
      {children}
    </div>
  );
}
