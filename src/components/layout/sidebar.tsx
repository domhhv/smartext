'use client';

import { Show, useUser, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import {
  KeyIcon,
  SunIcon,
  MoonIcon,
  LogInIcon,
  MonitorIcon,
  ExternalLinkIcon,
  FilePlusCornerIcon,
  PanelLeftCloseIcon,
  PanelRightCloseIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import posthog from 'posthog-js';
import * as React from 'react';

import GithubIcon from '@/components/icons/github';
import SidebarDocumentLinkButton from '@/components/layout/sidebar-document-link-button';
import { useDocument } from '@/components/providers/document-provider';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import useIsMobile from '@/lib/hooks/use-is-mobile';
import useTooltipGroup from '@/lib/hooks/use-tooltip-group';
import type { DocumentItem } from '@/lib/models/document.model';
import cn from '@/lib/utils/cn';

type SidebarProps = {
  documents: DocumentItem[];
  isAuthenticated: boolean;
  isDocumentsError: boolean;
};

export default function Sidebar({ documents, isAuthenticated, isDocumentsError }: SidebarProps) {
  const { isLoaded, user } = useUser();
  const isMobile = useIsMobile();
  const { closeSidebar, isExpanded, toggleSidebar } = useSidebar();
  const {
    activeDocument,
    documentIdBeingRemoved,
    documentIdInteractedWith,
    openDocumentDialog,
    setDocumentIdInteractedWith,
  } = useDocument();
  const segment = useSelectedLayoutSegment();
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const tooltipGroup = useTooltipGroup();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isMobile || !isExpanded) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('sidebar');

      if (sidebar && !sidebar.contains(target) && !documentIdInteractedWith) {
        closeSidebar();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeSidebar, isExpanded, isMobile, documentIdInteractedWith]);

  return (
    <>
      {isMobile && isExpanded && <div className="bg-background/80 fixed inset-0 z-40 backdrop-blur-xs" />}

      <aside
        id="sidebar"
        className={cn(
          'border-border bg-background sticky top-0 flex h-full flex-col max-md:border-r',
          !isAuthenticated && 'justify-between',
          isMobile
            ? cn(
                'fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-30',
                isExpanded ? 'translate-x-0' : '-translate-x-full'
              )
            : 'w-full min-w-0 overflow-hidden'
        )}
      >
        <div>
          <div
            onMouseLeave={tooltipGroup.onGroupMouseLeave}
            className="border-border flex items-center border-b px-1.5 py-2 transition-all"
          >
            <Button size="icon" variant="ghost" onClick={toggleSidebar} className="flex-shrink-0">
              {isExpanded ? <PanelLeftCloseIcon /> : <PanelRightCloseIcon />}
            </Button>
            {mounted && isExpanded && (
              <TooltipProvider>
                <div className="flex basis-full items-center justify-between gap-2 px-1">
                  <Tooltip delayDuration={tooltipGroup.getTooltipProps().delayDuration}>
                    <TooltipTrigger asChild onMouseEnter={tooltipGroup.getTooltipProps().onMouseEnter}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const nextTheme = theme === 'light' ? 'system' : theme === 'system' ? 'dark' : 'light';
                          posthog.capture('clicked_on_theme_mode', {
                            mode: nextTheme,
                          });
                          setTheme(nextTheme);
                        }}
                      >
                        {theme === 'light' && <SunIcon className="size-3.5" />}
                        {theme === 'system' && <MonitorIcon className="size-3.5" />}
                        {theme === 'dark' && <MoonIcon className="size-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="start">
                      <p className="text-sm">Toggle theme mode</p>
                      <span className="text-tiny">
                        Current setting: <strong>{theme || 'system'}</strong>
                      </span>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground flex flex-col gap-0.5 text-[9px] group-[.sidebar-author-badge-hidden]/sidebar:hidden">
                      <span className="text-right text-slate-500">
                        Built by{' '}
                        <Link
                          target="_blank"
                          rel="noopener noreferrer"
                          href="https://www.linkedin.com/in/domhhv"
                          className="text-muted-foreground hover:text-accent-foreground text-[9px] font-medium"
                        >
                          Dom H.
                        </Link>
                      </span>
                      <span className="rounded-full bg-slate-300 px-1 py-0.25 text-[8px] font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-400">
                        <span className="mr-1 inline-block size-1 rounded-full bg-slate-500 align-middle" />
                        Available for hire
                      </span>
                    </div>
                    <Tooltip delayDuration={tooltipGroup.getTooltipProps().delayDuration}>
                      <TooltipTrigger asChild onMouseEnter={tooltipGroup.getTooltipProps().onMouseEnter}>
                        <Link target="_blank" rel="noopener noreferrer" href="https://github.com/domhhv/smartext">
                          <Button size="xs" variant="outline" className="h-8 w-8">
                            <GithubIcon className="fill-muted-foreground size-4!" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex items-center gap-1">
                          <ExternalLinkIcon className="size-3" />
                          <span>View source code on GitHub</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>

        {!isAuthenticated && isExpanded && (
          <div className="p-4">
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Welcome to Smartext</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in or create an account to start creating and managing your documents.
            </p>
          </div>
        )}

        {isAuthenticated && !isExpanded && (
          <div className="mt-2 flex-1 text-center">
            <Button size="icon" variant="ghost" onClick={openDocumentDialog}>
              <FilePlusCornerIcon />
            </Button>
          </div>
        )}

        {isAuthenticated && isExpanded && (
          <>
            <div className="p-4 pb-0">
              <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Your documents</h3>
              {documents.length === 0 && !isDocumentsError && (
                <p className="text-muted-foreground mt-2 text-sm">Nothing here yet</p>
              )}
              {documents.length === 0 && isDocumentsError && (
                <Alert className="mt-1" variant="destructive">
                  <AlertDescription>Something went wrong while loading your documents</AlertDescription>
                </Alert>
              )}
              {segment === null ? (
                <Button className="mt-3 w-full" onClick={openDocumentDialog}>
                  New Document
                </Button>
              ) : (
                <Link href="/">
                  <Button variant="outline" className="mt-3 w-full">
                    Go to Editor
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {documents.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {documents.map((document) => {
                    return (
                      <li
                        key={document.id}
                        className="relative flex items-center rounded-md"
                        onMouseLeave={() => {
                          setDocumentIdInteractedWith('');
                        }}
                        onMouseEnter={() => {
                          setDocumentIdInteractedWith(document.id);
                        }}
                      >
                        <Link
                          prefetch={false}
                          href={{ pathname: '/', query: { document: document.id } }}
                          className={cn(
                            'focus:ring-accent flex-1 overflow-hidden focus:ring-2 focus:ring-offset-2 has-[.pending]:cursor-wait',
                            documentIdBeingRemoved === document.id && 'pointer-events-none cursor-wait',
                            document.id === activeDocument?.id && 'cursor-default'
                          )}
                          onClick={(e) => {
                            if (
                              document.id === activeDocument?.id ||
                              (e.target instanceof HTMLElement && e.target.dataset.slot === 'dropdown-menu-item')
                            ) {
                              return e.preventDefault();
                            }

                            if (isMobile) {
                              toggleSidebar();
                            }
                          }}
                        >
                          <SidebarDocumentLinkButton document={document} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        <div className={cn('border-border pt-2', isExpanded && 'border-t p-3')}>
          {!isLoaded && <Spinner className="mx-auto mb-2 size-6" />}
          <Show when="signed-out">
            <div className="flex flex-col gap-2">
              {isExpanded ? (
                <>
                  <SignInButton>
                    <Button variant="secondary">Log In</Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button>Register</Button>
                  </SignUpButton>
                </>
              ) : (
                <SignInButton mode="modal">
                  <Button size="icon" variant="ghost" className="mx-auto mb-1">
                    <LogInIcon className="size-4" />
                  </Button>
                </SignInButton>
              )}
            </div>
          </Show>
          <Show when="signed-in">
            <div className={cn('flex items-center gap-3', !isExpanded && 'justify-center pb-2')}>
              <UserButton
                userProfileUrl="/account"
                userProfileMode="navigation"
                appearance={{
                  elements: {
                    avatarBox: 'h-8 w-8',
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link label="API Keys" href="/account/api-keys" labelIcon={<KeyIcon size={16} />} />
                </UserButton.MenuItems>
              </UserButton>
              {isExpanded && user && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-foreground truncate text-sm font-medium">{user.fullName}</p>
                  {user.primaryEmailAddress && (
                    <p className="text-muted-foreground truncate text-xs">{user.primaryEmailAddress.emailAddress}</p>
                  )}
                </div>
              )}
            </div>
          </Show>
        </div>
      </aside>
    </>
  );
}
