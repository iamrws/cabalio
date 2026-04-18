'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SubmitDrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SubmitDrawerContext = createContext<SubmitDrawerContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function useSubmitDrawer() {
  return useContext(SubmitDrawerContext);
}

export function SubmitDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <SubmitDrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SubmitDrawerContext.Provider>
  );
}
