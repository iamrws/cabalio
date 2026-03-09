'use client';

import { motion } from 'framer-motion';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'green' | 'orange' | 'gold';
  hover?: boolean;
  onClick?: () => void;
}

const glowMap = {
  cyan: { border: 'border-neon-cyan/20', hover: 'hover:border-neon-cyan/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]' },
  purple: { border: 'border-neon-purple/20', hover: 'hover:border-neon-purple/60 hover:shadow-[0_0_20px_rgba(179,71,217,0.2)]' },
  green: { border: 'border-neon-green/20', hover: 'hover:border-neon-green/60 hover:shadow-[0_0_20px_rgba(57,255,20,0.2)]' },
  orange: { border: 'border-neon-orange/20', hover: 'hover:border-neon-orange/60 hover:shadow-[0_0_20px_rgba(255,107,53,0.2)]' },
  gold: { border: 'border-yellow-500/20', hover: 'hover:border-yellow-500/60 hover:shadow-[0_0_20px_rgba(255,215,0,0.2)]' },
};

export default function NeonCard({
  children,
  className = '',
  glowColor = 'cyan',
  hover = true,
  onClick,
}: NeonCardProps) {
  const glow = glowMap[glowColor];

  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        bg-bg-secondary rounded-xl border ${glow.border}
        ${hover ? glow.hover : ''}
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
