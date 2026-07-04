'use client';

import * as React from 'react';
import type { PropsWithChildren } from 'react';

import useIsMobile from '@/lib/hooks/use-is-mobile';

type SidebarContextType = {
  isExpanded: boolean;
  isMobile: boolean;
  closeSidebar: () => void;
  setIsExpanded: (value: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }

  return context;
}

type SidebarProviderProps = PropsWithChildren<{
  defaultIsExpanded?: boolean;
}>;

export default function SidebarProvider({ children, defaultIsExpanded = true }: SidebarProviderProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultIsExpanded);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setIsExpanded(isMobile ? false : defaultIsExpanded);
  }, [isMobile, defaultIsExpanded]);

  const toggleSidebar = React.useCallback(() => {
    setIsExpanded((prev) => {
      return !prev;
    });
  }, []);

  const closeSidebar = React.useCallback(() => {
    setIsExpanded(false);
  }, []);

  const value = React.useMemo(() => {
    return {
      closeSidebar,
      isExpanded,
      isMobile,
      setIsExpanded,
      toggleSidebar,
    };
  }, [isExpanded, toggleSidebar, closeSidebar, isMobile]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
