import { Component, computed, ElementRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { OverlayService } from '../../services/overlay/overlay.service';
import { SequenceEditorComponent } from '../entity-feature-animations/sequence-editor/sequence-editor.component';

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
  #sidenav = toSignal(this.#overlay.sidenav$);

  isOpen = computed(() => {
    const state = this.#sidenav();
    return state?.mode === 'animations' && !!state?.open;
  });

  nativeElement = inject<ElementRef<HTMLDivElement>>(ElementRef).nativeElement;

  mode = computed(() => (this.#sidenav()?.mode === 'animations' ? 'animations' : ''));
}
