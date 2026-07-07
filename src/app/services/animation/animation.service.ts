import { Injectable, computed, inject, signal } from '@angular/core';
import { AnimationGroup, TransformNode } from '@babylonjs/core';
import { BabylonService } from '../babylon/babylon.service';

export type AnimTarget = {
  name: string;
  node: TransformNode;
};

export type AnimationTreeNode = {
  kind: 'group';
  group: AnimationGroup;
  targets: AnimTarget[];
};

@Injectable({ providedIn: 'root' })
export class AnimationService {
  private babylon = inject(BabylonService);
  private beforePlayHook: (() => void) | null = null;

  readonly animationGroups$ = signal<AnimationGroup[] | undefined>(undefined);
  readonly activeGroup$ = signal<AnimationGroup | null>(null);

  readonly tree$ = computed(() => this.buildTree(this.animationGroups$()));

  constructor() {
    this.babylon.containers.entity$.subscribe(result => {
      // Stop any previously-active group first. The group belongs to the previous
      // entity and will be disposed by Babylon's clearScene; stop()/reset() are
      // defensively guarded (try/catch on reset()) so this is safe.
      this.stop();
      // Babylon's glTF loader auto-starts the first AnimationGroup on import
      // (animationStartMode default = FIRST). Reflect that auto-started state in
      // activeGroup$ so the panel can show a Stop button for the
      // already-playing animation instead of a Play button.
      const groups = result?.animationGroups ?? undefined;
      this.animationGroups$.set(groups);
      const started = groups?.find(g => g.isStarted) ?? null;
      this.activeGroup$.set(started);
    });
  }

  registerBeforePlayHook(fn: () => void): void {
    this.beforePlayHook = fn;
  }

  private runBeforePlay(): void {
    try {
      this.beforePlayHook?.();
    } catch {
      // best-effort; never block preview play
    }
  }

  play(group: AnimationGroup): void {
    this.runBeforePlay();
    if (this.activeGroup$() === group) return;
    this.stop();
    group.play(true);
    this.activeGroup$.set(group);
  }

  stop(): void {
    const active = this.activeGroup$();
    if (!active) return;
    active.stop();
    try {
      active.reset();
    } catch {
      // reset can throw on disposed groups; safe to ignore for preview
    }
    this.activeGroup$.set(null);
  }

  focusTarget(target: AnimTarget): void {
    const node = target.node as unknown as { getAbsolutePosition?: () => unknown };
    const pos =
      typeof node.getAbsolutePosition === 'function' ? node.getAbsolutePosition() : undefined;
    if (!pos) return;
    this.babylon.cameraManager.setActiveCameraTarget(pos as never, 2);
  }

  dispose(): void {
    this.stop();
    this.animationGroups$.set(undefined);
    this.activeGroup$.set(null);
  }

  private buildTree(groups: AnimationGroup[] | undefined): AnimationTreeNode[] {
    if (!groups?.length) return [];

    const normTarget = (t: unknown): AnimTarget => {
      const node = t as TransformNode;
      return {
        name: node?.name || '<unnamed>',
        node,
      };
    };

    return groups.map(group => ({
      kind: 'group' as const,
      group,
      targets: Array.from(
        new Map(
          group.targetedAnimations.map(ta => [ta.target?.uniqueId ?? 0, normTarget(ta.target)]),
        ).values(),
      ),
    }));
  }
}
