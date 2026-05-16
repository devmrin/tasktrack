const PHASE_SOUND_URL = {
  work: '/chime.mp3',
  break: '/break.mp3',
} as const;

const audioCache = new Map<string, HTMLAudioElement>();

export type PhaseCompletionKind = keyof typeof PHASE_SOUND_URL;

export function playPhaseCompletionSound(kind: PhaseCompletionKind): void {
  const url = PHASE_SOUND_URL[kind];
  let audio = audioCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audioCache.set(url, audio);
  }
  audio.currentTime = 0;
  void audio.play().catch(() => {
    /* Autoplay or decode failures — ignore silently. */
  });
}
