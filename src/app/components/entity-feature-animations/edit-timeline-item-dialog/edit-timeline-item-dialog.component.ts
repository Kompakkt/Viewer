import { Component, inject, InjectionToken, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  ButtonComponent,
  ButtonRowComponent,
  InputComponent,
  SlideToggleComponent,
} from '@kompakkt/komponents';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { TimelineItem } from 'src/app/services/sequence-editor.service';

@Component({
  selector: 'app-edit-timeline-item-dialog',
  imports: [
    TranslatePipe,
    InputComponent,
    SlideToggleComponent,
    ButtonComponent,
    ButtonRowComponent,
  ],
  templateUrl: './edit-timeline-item-dialog.component.html',
  styleUrl: './edit-timeline-item-dialog.component.scss',
})
export class EditTimelineItemDialogComponent {
  timelineItem = inject(MAT_DIALOG_DATA as InjectionToken<TimelineItem>);
  kind = this.timelineItem.kind;
  #ref = inject(MatDialogRef<EditTimelineItemDialogComponent, TimelineItem>);
  duration = signal(this.timelineItem.duration);
  holdEndState = signal(
    this.timelineItem.kind === 'sequence' ? this.timelineItem.holdEndState : false,
  );

  cancel() {
    this.#ref.close();
  }

  save() {
    if (this.timelineItem.kind === 'sequence') {
      this.#ref.close({
        ...this.timelineItem,
        duration: this.duration(),
        holdEndState: this.holdEndState(),
      });
    } else {
      this.#ref.close({ ...this.timelineItem, duration: this.duration() });
    }
  }
}
