import { Component, computed, ElementRef, inject } from '@angular/core';
import { OverlayService } from '../../services/overlay/overlay.service';
import { SequenceEditorComponent } from '../entity-feature-animations/sequence-editor/sequence-editor.component';
import { ProcessingService } from 'src/app/services/processing/processing.service';

@Component({
  selector: 'app-bottom-sheet',
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss'],
  imports: [SequenceEditorComponent],
  host: {
    '[class.is-visible]': 'isOpen()',
  },
})
export class BottomSheetComponent {
  #overlay = inject(OverlayService);
  #processing = inject(ProcessingService);

  isOpen = computed(() => {
    const state = this.#overlay.sidenav();
    if (!state?.open) return false;
    switch (state.mode) {
      case 'animations': {
        // Only enable animation sequence editor when processing mode is 'annotation'
        return this.#processing.mode() === 'annotation';
      }
      default: {
        return false;
      }
    }
  });

  nativeElement = inject<ElementRef<HTMLDivElement>>(ElementRef).nativeElement;

  sidenavMode = computed(() =>
    this.#overlay.sidenav()?.mode === 'animations' ? 'animations' : '',
  );
}
