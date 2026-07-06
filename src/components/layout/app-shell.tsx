'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import * as React from 'react';
import { usePanelRef } from 'react-resizable-panels';
import type { PanelSize } from 'react-resizable-panels';

import { useSidebar } from '@/components/providers/sidebar-provider';
import { ResizablePanel, ResizableHandle, ResizablePanelGroup } from '@/components/ui/resizable';
import LAYOUT_PANELS from '@/lib/constants/layout-panels';
import useIsMobile from '@/lib/hooks/use-is-mobile';
import setCookie from '@/lib/utils/set-cookie';

type AppShellProps = React.PropsWithChildren<{
  initialSidebarWidth: number;
  isSidebarInitiallyCollapsed: boolean;
  sidebar: React.ReactNode;
}>;

export default function AppShell({
  children,
  initialSidebarWidth,
  isSidebarInitiallyCollapsed,
  sidebar,
}: AppShellProps) {
  const segment = useSelectedLayoutSegment();
  const isMobile = useIsMobile();
  const { isExpanded, setIsExpanded } = useSidebar();
  const panelRef = usePanelRef();
  const lastExpandedWidthRef = React.useRef(initialSidebarWidth);

  React.useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    if (isExpanded && panel.isCollapsed()) {
      panel.resize(`${lastExpandedWidthRef.current}px`);
    } else if (!isExpanded && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isExpanded, panelRef]);

  if (['login', 'register'].includes(segment || '')) {
    return <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>;
  }

  if (isMobile) {
    return (
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {sidebar}
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    );
  }

  function handleSidebarResize(panelSize: PanelSize) {
    /* A collapsible panel snaps between collapsedSize and minSize, so no intermediate sizes occur */
    const isCollapsed = panelSize.inPixels < LAYOUT_PANELS.SIDEBAR_MIN_WIDTH;

    if (!isCollapsed) {
      lastExpandedWidthRef.current = Math.round(panelSize.inPixels);
    }

    setIsExpanded(!isCollapsed);
  }

  function handleLayoutChanged() {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    setCookie('sidebar-collapsed', String(panel.isCollapsed()));
    setCookie('sidebar-width', String(lastExpandedWidthRef.current));
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      onLayoutChanged={handleLayoutChanged}
      className="relative min-h-0 flex-1 overflow-hidden"
    >
      <ResizablePanel
        collapsible
        id="sidebar-panel"
        panelRef={panelRef}
        className="min-w-0"
        onResize={handleSidebarResize}
        maxSize={LAYOUT_PANELS.SIDEBAR_MAX_WIDTH}
        minSize={`${LAYOUT_PANELS.SIDEBAR_MIN_WIDTH}px`}
        collapsedSize={`${LAYOUT_PANELS.SIDEBAR_COLLAPSED_WIDTH}px`}
        defaultSize={
          isSidebarInitiallyCollapsed ? `${LAYOUT_PANELS.SIDEBAR_COLLAPSED_WIDTH}px` : `${initialSidebarWidth}px`
        }
      >
        {sidebar}
      </ResizablePanel>
      <ResizableHandle isWithHandle />
      <ResizablePanel id="main-panel" className="min-w-0" minSize={`${LAYOUT_PANELS.MAIN_MIN_WIDTH}px`}>
        <main className="h-full min-w-0 overflow-hidden">{children}</main>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
