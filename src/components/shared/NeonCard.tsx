'use client';

import { motion } from 'framer-motion';
import { KeyboardEvent } from 'react';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'green' | 'orange' | 'gold';
  variant?: 'default' | 'elevated' | 'dark' | 'accent';
  accent?: string;
  hover?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-white/80 border border-stone-200/60 shadow-[0_4px_20px_rgba(28,25,23,0.06)]',
  elevated: 'bg-white border border-stone-200/80 shadow-[0_8px_30px_rgba(28,25,23,0.1)]',
  dark: 'bg-[#1c1917] border border-stone-700/40 text-stone-100 shadow-[0_8px_30px_rgba(28,25,23,0.2)]',
  accent: 'bg-white/80 border border-stone-200/60 shadow-[0_4px_20px_rgba(28,25,23,0.06)]',
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
    <motion.div
      whileHover={hover ? { y: -1 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={`
        rounded-2xl ${variantStyles[variant]}
        ${hover ? 'transition-all duration-200 hover:shadow-[0_8px_30px_rgba(28,25,23,0.1)]' : ''}
        ${isInteractive ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]' : ''}
        ${className}
      `}
      style={accent ? { borderLeftWidth: '3px', borderLeftColor: accent } : undefined}
    >
      {children}
    </motion.div>
  );
}
