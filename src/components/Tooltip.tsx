import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

interface TooltipProps {
  readonly content: ReactNode;
  readonly children: ReactNode;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
  readonly sideOffset?: number;
  readonly delayDuration?: number;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delayDuration,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="z-[150] max-w-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 shadow-md select-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-white dark:fill-neutral-800" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
