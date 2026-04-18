import {
  Flame, Star, BrainCircuit, Palette, ThumbsUp,
  Zap, Link, PenLine, Gem, Crown, CalendarCheck,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'flame': Flame,
  'star': Star,
  'brain-circuit': BrainCircuit,
  'palette': Palette,
  'thumbs-up': ThumbsUp,
  'zap': Zap,
  'link': Link,
  'pen-line': PenLine,
  'gem': Gem,
  'crown': Crown,
  'calendar-check': CalendarCheck,
};

interface IconResolverProps {
  name: string;
  className?: string;
}

export function IconResolver({ name, className = 'w-4 h-4' }: IconResolverProps) {
  const Icon = iconMap[name];
  if (!Icon) return <span className={className}>{name}</span>;
  return <Icon className={className} />;
}
