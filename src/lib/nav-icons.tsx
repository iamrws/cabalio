import React from 'react';
import { Home, Newspaper, Plus, Trophy, Target, Gift, Settings } from 'lucide-react';

export const NAV_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="w-5 h-5" />,
  feed: <Newspaper className="w-5 h-5" />,
  plus: <Plus className="w-5 h-5" />,
  trophy: <Trophy className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  gift: <Gift className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
};
