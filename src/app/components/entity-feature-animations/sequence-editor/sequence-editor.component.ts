import { Component, computed, effect, inject, Pipe, PipeTransform, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { OverlayService } from 'src/app/services/overlay/overlay.service';
import { SequenceEditorService, TimelineItem } from 'src/app/services/sequence-editor.service';
import { PlaybackControllerService } from 'src/app/services/playback/playback-controller.service';
import { MatIconModule } from '@angular/material/icon';
import {
  ButtonComponent,
  InputComponent,
  MenuComponent,
  MenuOptionComponent,
  SelectComponent,
  TooltipDirective,
} from '@kompakkt/komponents';
import { MatDialog } from '@angular/material/dialog';
import { EditTimelineItemDialogComponent } from '../edit-timeline-item-dialog/edit-timeline-item-dialog.component';
import { firstValueFrom } from 'rxjs';

@Pipe({ name: 'framesToWidth' })
class FramesToWidthPipe implements PipeTransform {
  transform(frames: number, numFramesInView: number): string {
    return `calc((100vw - var(--sidebar-width) - 32px) * ${frames} / ${numFramesInView})`;
  }
}

@Component({
  selector: 'app-sequence-editor',
  imports: [
    TranslatePipe,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    FramesToWidthPipe,
    MatIconModule,
    ButtonComponent,
    InputComponent,
    MenuComponent,
    MenuOptionComponent,
    SelectComponent,
    TooltipDirective,
  ],
  templateUrl: './sequence-editor.component.html',
  styleUrl: './sequence-editor.component.scss',
})
export class SequenceEditorComponent {
  #overlay = inject(OverlayService);
  #dialog = inject(MatDialog);
  #sidenav = toSignal(this.#overlay.sidenav$);
  service = inject(SequenceEditorService);
  playback = inject(PlaybackControllerService);
  isAnimationMode = computed(() => this.#sidenav()?.mode === 'animations');
  isVisible = computed(() => this.#sidenav()?.open && this.isAnimationMode());
  _invisibleStopRef = effect(() => {
    const visible = this.isVisible();
    if (!visible && this.playback.transport() !== 'stopped') {
      this.playback.stop();
    }
  });

  numFramesInView = signal(1000);
  readonly #minFrames = 100;
  readonly #maxFrames = 5000;

  zoomIn(): void {
    this.numFramesInView.update(v => Math.max(this.#minFrames, Math.round(v / 1.4)));
  }

  zoomOut(): void {
    this.numFramesInView.update(v => Math.min(this.#maxFrames, Math.round(v * 1.4)));
  }

  onRowClick(event: MouseEvent, rowIndex: number): void {
    const rowEl = event.currentTarget as HTMLElement;
    const rect = rowEl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const targetFrame = ratio * this.numFramesInView();
    this.playback.seekRow(rowIndex, targetFrame);
  }

  isTimelineContainerScrollable = computed(() => {
    const timelines = this.service.timelines();
    const totalDuration = timelines.reduce((sum, timeline) => {
      return sum + timeline.reduce((timelineSum, item) => timelineSum + item.duration, 0);
    }, 0);
    return totalDuration > this.numFramesInView();
  });

  drop(event: CdkDragDrop<TimelineItem[]>) {
    this.service.moveItem(event);
  }

  async editItem() {
    const item = this.service.selectedItem();
    if (!item) return;
    const ref = this.#dialog.open<EditTimelineItemDialogComponent, TimelineItem, TimelineItem>(
      EditTimelineItemDialogComponent,
      { data: item },
    );
    const result = await firstValueFrom(ref.afterClosed());
    if (result) this.service.updateItem(result);
  }

  duplicateItem() {
    const item = this.service.selectedItem();
    if (!item) return;
    this.service.duplicateItem(item);
  }

  removeItem() {
    const item = this.service.selectedItem();
    if (!item) return;
    this.service.removeItem(item);
  }

  importTimeline(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then(text => {
        try {
          this.service.deserializeOrMerge(text);
        } catch {
          console.warn('Import failed: malformed or incompatible file');
        }
      });
    };
    input.click();
  }

  exportActiveSequence(): void {
    const data = this.service.serializeActive();
    const seq = this.service.sequences().find(s => s.id === this.service.activeSequenceId());
    const name = seq?.name ?? 'sequence';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kompakkt-sequence-${name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportAllSequences(): void {
    const data = this.service.serialize();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kompakkt-sequences-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onNameInput(name: string): void {
    this.service.renameSequence(this.service.activeSequenceId(), name);
  }

  addSequence(): void {
    this.service.addSequence();
  }

  deleteSequence(): void {
    this.service.removeSequence(this.service.activeSequenceId());
  }
}
