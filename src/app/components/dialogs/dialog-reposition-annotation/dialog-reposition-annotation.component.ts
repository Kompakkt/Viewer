import { Component, computed, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ButtonComponent, ButtonRowComponent } from '@kompakkt/komponents';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Vector3 } from '@babylonjs/core';

export type RepositionAnnotationDialogChoice = 'apply' | 'reset';

type ChangedPositions = {
  prev: Vector3;
  curr: Vector3;
};

@Component({
  selector: 'app-dialog-reposition-annotation',
  imports: [ButtonComponent, ButtonRowComponent, TranslatePipe],
  templateUrl: './dialog-reposition-annotation.component.html',
  styleUrl: './dialog-reposition-annotation.component.scss',
})
export class DialogRepositionAnnotationComponent {
  #ref = inject(MatDialogRef<DialogRepositionAnnotationComponent>);
  #positions = signal<ChangedPositions | undefined>(undefined);
  hasChanged = computed(() => {
    const positions = this.#positions();
    if (!positions) return false;
    const distance = Vector3.Distance(positions.prev, positions.curr);
    return distance > 0;
  });

  public close(choice: RepositionAnnotationDialogChoice) {
    this.#ref.close(choice);
  }

  public updatePositions(positions: ChangedPositions) {
    this.#positions.set(positions);
  }
}
