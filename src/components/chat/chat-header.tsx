import { KeyIcon, PanelLeft } from 'lucide-react';
import Link from 'next/link';

import TooltipButton from '@/components/custom/tooltip-button';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { Button } from '@/components/ui/button';
import useIsMobile from '@/lib/hooks/use-is-mobile';
import cn from '@/lib/utils/cn';

export default function ChatHeader() {
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="border-border flex items-center gap-2 overflow-x-auto border-b p-2 py-2.5">
      <div className="flex min-w-0 basis-full items-center justify-between gap-2">
        <div className={cn('flex min-w-0 flex-shrink items-center gap-2', !isMobile && 'px-2')}>
          {isMobile && (
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSidebar}
              aria-label="Toggle Sidebar"
              className="h-8 w-8 shrink-0"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <h3 className="sansation-bold hidden scroll-m-20 truncate text-2xl font-semibold tracking-tight text-slate-600 md:block dark:text-slate-300">
            Smartext
          </h3>
        </div>
      </div>

      <Link href="/account/api-keys">
        <TooltipButton
          size="sm"
          variant="outline"
          tooltip="Manage API Keys"
          aria-label="Manage API Keys"
          className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
        >
          <KeyIcon className="size-3.5" />
        </TooltipButton>
      </Link>
    </div>
  );
}
