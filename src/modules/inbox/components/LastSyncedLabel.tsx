import { useEffect, useState } from 'react';
import { Tooltip } from '@/components/Tooltip';
import {
  formatAbsoluteTimestamp,
  formatRelativeTimeAgo,
} from '@/utils/formatRelativeTimeAgo';

const REFRESH_MS = 60_000;

type LastSyncedLabelProps = {
  isoString: string;
};

export function LastSyncedLabel({ isoString }: LastSyncedLabelProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const relative = formatRelativeTimeAgo(isoString, now);
  const absolute = formatAbsoluteTimestamp(isoString);

  return (
    <Tooltip content={absolute} side="bottom" align="end">
      <span className="mt-1 block cursor-default text-right text-[10px] text-neutral-400 dark:text-neutral-500">
        Last synced {relative}
      </span>
    </Tooltip>
  );
}
