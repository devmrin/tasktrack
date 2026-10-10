import assert from 'node:assert/strict';
import test from 'node:test';

type EndedHandler = (() => void) | null;

class FakeAudio {
  static instances: FakeAudio[] = [];
  static failNextPlay = false;

  src: string;
  currentTime = 0;
  paused = true;
  onended: EndedHandler = null;
  playCount = 0;

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.playCount += 1;
    if (FakeAudio.failNextPlay) {
      FakeAudio.failNextPlay = false;
      return Promise.reject(new Error('blocked'));
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

globalThis.Audio = FakeAudio as unknown as typeof Audio;

const { previewPhaseCompletionSound, stopPhaseCompletionSounds } = await import(
  '@/modules/focus/utils/playPhaseCompletionSound'
);

function audioFor(src: string): FakeAudio {
  const audio = FakeAudio.instances.find((item) => item.src === src);
  assert.ok(audio, `expected audio for ${src}`);
  return audio;
}

async function flushPlayback(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

test('completion sound preview plays, replaces, and stops each tone', async () => {
  previewPhaseCompletionSound('work');
  const work = audioFor('/chime.mp3');
  assert.equal(work.playCount, 1);
  assert.equal(work.paused, false);

  let workEnded = 0;
  previewPhaseCompletionSound('work', () => {
    workEnded += 1;
  });
  work.onended?.();
  assert.equal(workEnded, 1);

  previewPhaseCompletionSound('break');
  const rest = audioFor('/break.mp3');
  assert.equal(work.paused, true);
  assert.equal(work.currentTime, 0);
  assert.equal(rest.playCount, 1);
  assert.equal(rest.paused, false);

  let replaced = 0;
  FakeAudio.failNextPlay = true;
  previewPhaseCompletionSound('work', () => {
    replaced += 1;
  });
  previewPhaseCompletionSound('break', () => {
    replaced += 1;
  });
  await flushPlayback();
  assert.equal(replaced, 0);
  rest.onended?.();
  assert.equal(replaced, 1);

  let stopped = 0;
  FakeAudio.failNextPlay = true;
  previewPhaseCompletionSound('work', () => {
    stopped += 1;
  });
  stopPhaseCompletionSounds();
  await flushPlayback();
  assert.equal(stopped, 0);
  assert.equal(work.paused, true);

  let failed = 0;
  FakeAudio.failNextPlay = true;
  previewPhaseCompletionSound('break', () => {
    failed += 1;
  });
  await flushPlayback();
  assert.equal(failed, 1);
});
