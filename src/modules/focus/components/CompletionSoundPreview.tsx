import { useEffect, useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import {
  previewPhaseCompletionSound,
  stopPhaseCompletionSounds,
  type PhaseCompletionKind,
} from '@/modules/focus/utils/playPhaseCompletionSound';

const PREVIEWS: readonly {
  kind: PhaseCompletionKind;
  label: string;
  previewLabel: string;
}[] = [
  { kind: 'work', label: 'Work chime', previewLabel: 'Preview work session chime' },
  { kind: 'break', label: 'Break tone', previewLabel: 'Preview break tone' },
];

function previewButtonClass(isPlaying: boolean): string {
  const base =
    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors';
  const state = isPlaying
    ? 'border-neutral-800 bg-neutral-800 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900'
    : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700';
  return `${base} ${state}`;
}

export function CompletionSoundPreview() {
  const [playing, setPlaying] = useState<PhaseCompletionKind | null>(null);

  useEffect(() => {
    return () => {
      stopPhaseCompletionSounds();
    };
  }, []);

  function preview(kind: PhaseCompletionKind) {
    setPlaying(kind);
    previewPhaseCompletionSound(kind, () => {
      setPlaying((current) => (current === kind ? null : current));
    });
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {PREVIEWS.map(({ kind, label, previewLabel }) => {
        const isPlaying = playing === kind;
        const Icon = isPlaying ? Volume2 : Play;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isPlaying}
            aria-label={previewLabel}
            onClick={() => preview(kind)}
            className={previewButtonClass(isPlaying)}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
