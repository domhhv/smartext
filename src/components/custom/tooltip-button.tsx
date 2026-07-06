import type { Ref, ReactNode, ComponentProps } from 'react';
import * as React from 'react';

import Shortcut from '@/components/custom/shortcut';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type TooltipButtonProps = {
  'aria-label'?: string;
  children: ReactNode;
  delayDuration?: number;
  ref?: Ref<HTMLButtonElement>;
  shortcut?: readonly string[];
  tooltip: string | ReactNode;
  tooltipContentProps?: ComponentProps<typeof TooltipContent>;
  onClick?: () => void;
  onMouseEnter?: () => void;
} & Pick<ComponentProps<typeof Button>, 'variant' | 'size' | 'disabled' | 'className'>;

export default function TooltipButton({
  'aria-label': ariaLabel,
  children,
  className,
  delayDuration = 500,
  disabled = false,
  onClick,
  onMouseEnter,
  ref,
  shortcut,
  size = 'icon',
  tooltip,
  tooltipContentProps = {},
  variant = 'ghost',
}: TooltipButtonProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild onMouseEnter={onMouseEnter}>
        <Button
          ref={ref}
          size={size}
          variant={variant}
          onClick={onClick}
          disabled={disabled}
          className={className}
          {...(ariaLabel && { 'aria-label': ariaLabel })}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2 p-2 pr-2.5" {...tooltipContentProps}>
        {tooltip} <Shortcut keys={shortcut} />
      </TooltipContent>
    </Tooltip>
  );
}
