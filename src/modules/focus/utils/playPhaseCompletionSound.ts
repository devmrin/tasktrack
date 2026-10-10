const PHASE_SOUND_URL = {
  work: '/chime.mp3',
  break: '/break.mp3',
} as const;

const audioCache = new Map<string, HTMLAudioElement>();

/** Bumped whenever playback is replaced so a stale play() rejection cannot clear the new preview. */
let playbackGeneration = 0;

export type PhaseCompletionKind = keyof typeof PHASE_SOUND_URL;

function getAudio(url: string): HTMLAudioElement {
  let audio = audioCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audioCache.set(url, audio);
  }
  return audio;
}

function silenceAll(): void {
  playbackGeneration += 1;
  for (const audio of audioCache.values()) {
    audio.pause();
    audio.onended = null;
    audio.currentTime = 0;
  }
}

export function playPhaseCompletionSound(kind: PhaseCompletionKind): void {
  const audio = getAudio(PHASE_SOUND_URL[kind]);
  audio.onended = null;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    /* Autoplay or decode failures — ignore silently. */
  });
}

export function stopPhaseCompletionSounds(): void {
  silenceAll();
}

export function previewPhaseCompletionSound(
  kind: PhaseCompletionKind,
  onEnded?: () => void,
): void {
  silenceAll();
  const generation = playbackGeneration;
  const audio = getAudio(PHASE_SOUND_URL[kind]);
  const finish = () => {
    if (generation !== playbackGeneration) return;
    audio.onended = null;
    onEnded?.();
  };
  audio.onended = finish;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    finish();
  });
}
