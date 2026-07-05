import { FileIcon, FolderIcon, FolderOpenIcon, type LucideIcon } from 'lucide-react';
import * as React from 'react';

function PlaceholderRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0" />
      <span className="truncate text-sm">{label}</span>
    </div>
  );
}

function PlaceholderGroup({ children }: React.PropsWithChildren) {
  return <div className="border-border/70 ml-2 flex flex-col gap-2 border-l border-dashed pl-3">{children}</div>;
}

export default function SidebarDirectoryPlaceholder({ description }: { description?: string }) {
  return (
    <div className="mt-3">
      <p className="text-muted-foreground text-sm">
        {description ||
          'Nothing here yet. Create your first document, or use folders to organize your work — for example:'}
      </p>
      <div
        aria-hidden
        className="border-border/70 text-muted-foreground/80 pointer-events-none mt-4 flex flex-col gap-2 rounded-lg border border-dashed p-3 select-none"
      >
        <PlaceholderRow icon={FolderOpenIcon} label="Product launch" />
        <PlaceholderGroup>
          <PlaceholderRow label="Research" icon={FolderOpenIcon} />
          <PlaceholderGroup>
            <PlaceholderRow icon={FileIcon} label="Competitor notes" />
            <PlaceholderRow icon={FileIcon} label="User interviews" />
          </PlaceholderGroup>
          <PlaceholderRow icon={FileIcon} label="Press release" />
        </PlaceholderGroup>
        <PlaceholderRow label="Personal" icon={FolderIcon} />
        <PlaceholderRow icon={FileIcon} label="Reading list" />
        <PlaceholderRow icon={FileIcon} label="Journal" />
      </div>
    </div>
  );
}
