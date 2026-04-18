import React from 'react';
import { Home, Trophy, Settings, User } from 'lucide-react';

export const NAV_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="w-5 h-5" />,
  trophy: <Trophy className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  user: <User className="w-5 h-5" />,
};
