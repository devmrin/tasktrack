import { RefreshCw } from 'lucide-react';

type JiraSyncIconProps = {
  syncing: boolean;
  className?: string;
};

/**
 * Dual-arrow sync icon. Rotation runs on a wrapper so it keeps animating while the
 * parent button uses aria-disabled (native disabled blocks child animations).
 */
export function JiraSyncIcon({ syncing, className = '' }: JiraSyncIconProps) {
  return (
    <span
      className={`inline-flex size-3.5 shrink-0 items-center justify-center ${
        syncing ? 'motion-safe:animate-sync-chase' : ''
      } ${className}`}
      aria-hidden
    >
      <RefreshCw className="size-3.5" />
    </span>
  );
}
