import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { AnimationGroup } from '@babylonjs/core';
import { AnimationService } from '../animation/animation.service';
import { SequenceEditorService, TimelineItem } from '../sequence-editor.service';

export type TransportState = 'stopped' | 'playing' | 'paused';

type ItemSpan = { item: TimelineItem; startFrame: number; endFrame: number };

@Injectable({ providedIn: 'root' })
export class PlaybackControllerService {
  #animation = inject(AnimationService);
  #seq = inject(SequenceEditorService);

  readonly fps = signal(60);
  readonly loop = signal(false);
  readonly transport = signal<TransportState>('stopped');
  readonly cursors = signal<number[]>([]);
  readonly rowTotals = computed(() =>
    this.#seq.timelines().map(row => row.reduce((s, it) => s + it.duration, 0)),
  );

  private rafHandle: number | null = null;
  private lastTimestamp: number | null = null;
  private playingRowItem: (string | null)[] = [];
  private lastRowFingerprint = '';

  constructor() {
    this.#animation.registerBeforePlayHook(() => {
      if (this.transport() !== 'stopped') this.stop();
    });

    effect(() => {
      const timelines = this.#seq.timelines();
      const fingerprint = this.fingerprint(timelines);
      const structural = fingerprint !== this.lastRowFingerprint;
      this.lastRowFingerprint = fingerprint;
      if (this.transport() !== 'stopped' && structural) {
        this.stop();
        return;
      }
      if (this.transport() === 'stopped') {
        this.cursors.set(timelines.map(() => 0));
        this.playingRowItem = timelines.map(() => null);
      }
    });
  }

  play(): void {
    this.#animation.stop();
    const totals = this.rowTotals();
    if (this.playheadAtEnd() || this.transport() === 'stopped') {
      this.cursors.set(totals.map(() => 0));
      this.playingRowItem = totals.map(() => null);
    }
    const timelines = this.#seq.timelines();
    const cursors = this.cursors();
    for (let r = 0; r < timelines.length; r++) {
      const total = totals[r];
      if (total <= 0 || cursors[r] >= total) continue;
      const span = this.itemAt(r, cursors[r]);
      this.dispatchItemChange(r, cursors[r], span);
    }
    this.transport.set('playing');
    this.lastTimestamp = null;
    this.rafHandle = requestAnimationFrame(this.tick);
  }

  pause(): void {
    if (this.transport() !== 'playing') return;
    this.forEachActiveSequence(group => group.pause());
    this.cancelRaf();
    this.transport.set('paused');
  }

  stop(): void {
    this.forEachActiveSequence(group => {
      group.stop();
      try {
        group.reset();
      } catch {
        // reset can throw on disposed groups; safe to ignore
      }
    });
    this.playingRowItem = this.#seq.timelines().map(() => null);
    this.cursors.set(this.rowTotals().map(() => 0));
    this.cancelRaf();
    this.transport.set('stopped');
  }

  seekRow(row: number, frame: number): void {
    const totals = this.rowTotals();
    const clamped = Math.max(0, Math.min(frame, totals[row] ?? 0));
    this.stopPrev(row);
    const next = this.cursors().slice();
    while (next.length <= row) next.push(0);
    next[row] = clamped;
    this.cursors.set(next);
    if (this.transport() === 'playing') {
      const total = totals[row] ?? 0;
      if (total <= 0 || clamped >= total) {
        this.playingRowItem[row] = null;
        return;
      }
      const span = this.itemAt(row, clamped);
      this.dispatchItemChange(row, clamped, span);
    }
  }

  toggleLoop(v = !this.loop()): void {
    this.loop.set(v);
  }

  setFps(v: number): void {
    this.fps.set(Math.max(1, v));
    if (this.transport() !== 'playing') return;
    this.forEachActiveSequence(group => {
      const nativeFps = group.targetedAnimations[0]?.animation.framePerSecond || 60;
      for (const animatable of group.animatables) {
        animatable.speedRatio = v / nativeFps;
      }
    });
  }

  private tick = (timestamp: number): void => {
    if (this.transport() !== 'playing') return;
    const dt = this.lastTimestamp == null ? 0 : (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const rows = this.#seq.timelines();
    const totals = this.rowTotals();
    const framesPerSec = this.fps();
    const next = this.cursors().slice();
    for (let r = 0; r < rows.length; r++) {
      const total = totals[r];
      let cursor = next[r] ?? 0;
      if (cursor >= total) continue;
      cursor += dt * framesPerSec;
      if (cursor >= total) cursor = total;
      const span = this.itemAt(r, cursor);
      const prevId = this.playingRowItem[r];
      if (span.item && span.item.id !== prevId) {
        this.dispatchItemChange(r, cursor, span);
      }
      next[r] = cursor;
    }
    this.cursors.set(next);

    if (next.every((c, i) => c >= totals[i])) {
      if (this.loop()) this.rewindAndContinue();
      else this.stop();
      return;
    }
    this.rafHandle = requestAnimationFrame(this.tick);
  };

  private rewindAndContinue(): void {
    this.forEachActiveSequence(group => {
      group.stop();
      try {
        group.reset();
      } catch {
        // ignore
      }
    });
    this.playingRowItem = this.#seq.timelines().map(() => null);
    this.cursors.set(this.rowTotals().map(() => 0));
    this.lastTimestamp = null;
    this.rafHandle = requestAnimationFrame(this.tick);
  }

  private itemAt(row: number, cursor: number): ItemSpan {
    const items = this.#seq.timelines()[row] ?? [];
    let acc = 0;
    for (const item of items) {
      if (cursor < acc + item.duration) {
        return { item, startFrame: acc, endFrame: acc + item.duration };
      }
      acc += item.duration;
    }
    const last = items[items.length - 1];
    return last
      ? { item: last, startFrame: acc - last.duration, endFrame: acc }
      : { item: null as never, startFrame: 0, endFrame: 0 };
  }

  private dispatchItemChange(row: number, cursor: number, span: ItemSpan): void {
    this.stopPrev(row);
    const item = span.item;
    if (!item) {
      this.playingRowItem[row] = null;
      return;
    }
    if (item.kind === 'sequence') {
      const group = item.animationGroup;
      if (!group) {
        this.playingRowItem[row] = item.id;
        return;
      }
      const nativeFps = group.targetedAnimations[0]?.animation.framePerSecond || 60;
      const speedRatio = this.fps() / nativeFps;
      const offset = Math.max(0, cursor - span.startFrame);
      const from = group.from + offset;
      group.stop();
      try {
        group.reset();
      } catch {
        // ignore
      }
      group.start(false, speedRatio, from, group.to);
      this.playingRowItem[row] = item.id;
    } else {
      this.playingRowItem[row] = item.id;
    }
  }

  private stopPrev(row: number): void {
    const id = this.playingRowItem[row];
    if (id == null) return;
    const timelines = this.#seq.timelines();
    const prev = timelines[row]?.find(it => it.id === id);
    if (prev?.kind === 'sequence' && prev.animationGroup) {
      prev.animationGroup.stop();
      if (!prev.holdEndState) {
        try {
          prev.animationGroup.reset();
        } catch {
          // ignore
        }
      }
    }
    this.playingRowItem[row] = null;
  }

  private playheadAtEnd(): boolean {
    const cursors = this.cursors();
    return this.rowTotals().every((total, i) => (cursors[i] ?? 0) >= total);
  }

  private cancelRaf(): void {
    if (this.rafHandle != null) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = null;
    this.lastTimestamp = null;
  }

  private fingerprint(timelines: TimelineItem[][]): string {
    return timelines.map(row => row.map(it => `${it.id}:${it.duration}`).join(',')).join('|');
  }

  private forEachActiveSequence(fn: (group: AnimationGroup) => void): void {
    const timelines = this.#seq.timelines();
    for (let r = 0; r < timelines.length; r++) {
      const id = this.playingRowItem[r];
      if (id == null) continue;
      const item = timelines[r]?.find(it => it.id === id);
      if (item?.kind === 'sequence' && item.animationGroup) fn(item.animationGroup);
    }
  }
}
