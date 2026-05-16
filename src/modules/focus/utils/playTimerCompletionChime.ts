const CHIME_URL = '/chime.mp3';

let sharedAudio: HTMLAudioElement | null = null;

export function playTimerCompletionChime(): void {
  if (!sharedAudio) {
    sharedAudio = new Audio(CHIME_URL);
  }
  sharedAudio.currentTime = 0;
  void sharedAudio.play().catch(() => {
    /* Autoplay or decode failures — ignore silently. */
  });
}
