import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AnimationGroup } from '@babylonjs/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { v7 as uuid } from 'uuid';
import { AnimationService } from './animation/animation.service';

export type Sequence = {
  id: string;
  kind: 'sequence';
  name: string;
  duration: number;
  animationGroup: AnimationGroup | undefined;
  holdEndState: boolean;
};

export type Spacer = {
  id: string;
  kind: 'spacer';
  name: string;
  duration: number;
};

export type TimelineItem = Sequence | Spacer;

export type NamedSequence = {
  id: string;
  name: string;
  timelines: TimelineItem[][];
};

@Injectable({ providedIn: 'root' })
export class SequenceEditorService {
  private readonly _defaultId = uuid();
  readonly sequences = signal<NamedSequence[]>([
    {
      id: this._defaultId,
      name: 'Sequence 1',
      timelines: [[]],
    },
  ]);
  readonly activeSequenceId = signal<string>(this._defaultId);
  readonly timelines = computed(() => {
    const seq = this.sequences().find(s => s.id === this.activeSequenceId());
    return seq?.timelines ?? [[]];
  });
  readonly latestItem = signal<TimelineItem | undefined>(undefined);
  readonly selectedItem = signal<TimelineItem | undefined>(undefined);
  readonly canAddTimeline = computed(() => {
    const timelines = this.timelines();
    if (timelines.length === 0) return true;
    const lastTimeline = timelines[timelines.length - 1];
    return lastTimeline.length > 0;
  });

  #animation = inject(AnimationService);

  private updateActiveTimelines(fn: (t: TimelineItem[][]) => TimelineItem[][]): void {
    this.sequences.update(seqs =>
      seqs.map(s => (s.id === this.activeSequenceId() ? { ...s, timelines: fn(s.timelines) } : s)),
    );
  }

  private insertItem(item: TimelineItem): void {
    const after = this.selectedItem();
    const currentTimelines = this.timelines();
    if (currentTimelines.length === 0) {
      this.updateActiveTimelines(() => [[item]]);
    } else if (after) {
      this.updateActiveTimelines(() =>
        currentTimelines.map(timeline => {
          const idx = timeline.findIndex(it => it.id === after.id);
          if (idx === -1) return timeline;
          return [...timeline.slice(0, idx + 1), item, ...timeline.slice(idx + 1)];
        }),
      );
    } else {
      this.updateActiveTimelines(() => {
        const next = [...currentTimelines];
        next[0] = [...next[0], item];
        return next;
      });
    }
    this.latestItem.set(item);
  }

  constructor() {
    effect(() => {
      this.selectedItem.set(this.latestItem());
    });
  }

  addSequence(): string {
    const id = uuid();
    const n = this.sequences().length + 1;
    this.sequences.update(seqs => [...seqs, { id, name: `Sequence ${n}`, timelines: [[]] }]);
    this.activeSequenceId.set(id);
    return id;
  }

  removeSequence(id: string): void {
    this.sequences.update(seqs => {
      if (seqs.length <= 1) return seqs;
      return seqs.filter(s => s.id !== id);
    });
    if (this.activeSequenceId() === id) {
      this.activeSequenceId.set(this.sequences()[0]?.id ?? '');
    }
  }

  renameSequence(id: string, name: string): void {
    this.sequences.update(seqs =>
      seqs.map(s => (s.id === id ? { ...s, name: name || 'Untitled Sequence' } : s)),
    );
  }

  switchSequence(id: string): void {
    this.activeSequenceId.set(id);
    this.selectedItem.set(undefined);
  }

  addSequenceItem(animationGroup: AnimationGroup) {
    this.insertItem({
      id: uuid(),
      kind: 'sequence',
      animationGroup,
      name: animationGroup.name,
      duration: animationGroup.to - animationGroup.from,
      holdEndState: false,
    });
  }

  addSpacer() {
    this.insertItem({
      id: uuid(),
      kind: 'spacer',
      name: 'Spacer',
      duration: 60,
    });
  }

  updateItem(item: TimelineItem) {
    this.updateActiveTimelines(timelines =>
      timelines.map(row => row.map(it => (it.id === item.id ? item : it))),
    );
    if (this.selectedItem()?.id === item.id) this.selectedItem.set(item);
  }

  duplicateItem(item: TimelineItem) {
    const newItem: TimelineItem = {
      ...item,
      id: uuid(),
    };
    const currentTimelines = this.timelines();
    const newTimelines = currentTimelines.map(timeline => {
      const idx = timeline.findIndex(seq => seq.id === item.id);
      if (idx === -1) return timeline;
      return [...timeline.slice(0, idx + 1), newItem, ...timeline.slice(idx + 1)];
    });
    this.updateActiveTimelines(() => newTimelines);
  }

  removeItem(item: TimelineItem) {
    this.updateActiveTimelines(timelines =>
      timelines.map(row => row.filter(it => it.id !== item.id)),
    );
    const flat = this.timelines().flat();
    this.selectedItem.set(flat.length > 0 ? flat[flat.length - 1] : undefined);
  }

  addTimeline() {
    this.updateActiveTimelines(t => [...t, []]);
  }

  moveItem(event: CdkDragDrop<TimelineItem[]>) {
    const moved = event.previousContainer.data[event.previousIndex];
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      this.updateActiveTimelines(timelines => {
        const i = this.#timelineIndexOf(event.container.data, timelines);
        if (i === -1) return timelines;
        const row = [...timelines[i]];
        row.splice(event.previousIndex, 1);
        row.splice(event.currentIndex, 0, moved);
        const next = [...timelines];
        next[i] = row;
        return next;
      });
    } else {
      this.updateActiveTimelines(timelines => {
        const fromI = this.#timelineIndexOf(event.previousContainer.data, timelines);
        const toI = this.#timelineIndexOf(event.container.data, timelines);
        if (fromI === -1 || toI === -1) return timelines;
        const fromRow = [...timelines[fromI]];
        const toRow = [...timelines[toI]];
        fromRow.splice(event.previousIndex, 1);
        toRow.splice(event.currentIndex, 0, moved);
        const next = [...timelines];
        next[fromI] = fromRow;
        next[toI] = toRow;
        return next;
      });
    }
    this.selectedItem.set(moved);
  }

  removeTimeline(index: number) {
    const currentTimelines = this.timelines();
    const removedTimeline = currentTimelines[index];
    const filtered = currentTimelines.filter((_, i) => i !== index);
    this.updateActiveTimelines(() => (filtered.length === 0 ? [[]] : filtered));
    if (this.selectedItem() && removedTimeline.some(it => it.id === this.selectedItem()!.id)) {
      this.selectedItem.set(undefined);
    }
  }

  serialize(): string {
    return JSON.stringify(this.sequences(), (key, value) =>
      key === 'animationGroup' ? undefined : value,
    );
  }

  serializeActive(): string {
    const seq = this.sequences().find(s => s.id === this.activeSequenceId());
    // ponytail: empty array download; guard in component if UX matters
    if (!seq) return '[]';
    return JSON.stringify([seq], (key, value) => (key === 'animationGroup' ? undefined : value));
  }

  deserializeOrMerge(json: string): void {
    // ponytail: error guard lives in importTimeline component method; extract if more callers appear
    const groups = this.#animation.animationGroups$() ?? [];
    const data = JSON.parse(json) as NamedSequence[];
    const isEmpty =
      this.sequences().length === 1 && this.sequences()[0].timelines.every(row => row.length === 0);
    const imported: NamedSequence[] = data.map(seq => ({
      id: uuid(),
      name: seq.name,
      timelines: seq.timelines.map(row =>
        row.map(item =>
          item.kind === 'sequence'
            ? {
                ...item,
                id: uuid(),
                animationGroup: groups.find(g => g.name === item.name),
                holdEndState: item.holdEndState ?? false,
              }
            : {
                // ponytail: same as sequence above
                ...item,
                id: uuid(),
              },
        ),
      ),
    }));
    if (isEmpty) this.sequences.set(imported);
    else this.sequences.update(seqs => [...seqs, ...imported]);
    if (imported.length > 0) this.switchSequence(imported[0].id);
  }

  #timelineIndexOf(rowData: TimelineItem[], timelines: TimelineItem[][]): number {
    return timelines.findIndex(t => t === rowData);
  }
}
