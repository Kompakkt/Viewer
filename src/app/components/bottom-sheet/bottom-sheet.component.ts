import { Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { OverlayService } from '../../services/overlay/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SequenceEditorComponent } from '../entity-feature-animations/sequence-editor/sequence-editor.component';
import { ProcessingService } from 'src/app/services/processing/processing.service';

const BOTTOM_SHEET_HEIGHT_STORAGE_KEY = 'bottomSheetHeight';
const BOTTOM_SHEET_MIN_RATIO = 0.2;
const BOTTOM_SHEET_MAX_RATIO = 0.5;
const BOTTOM_SHEET_KEYBOARD_STEP = 10;
const BOTTOM_SHEET_KEYBOARD_STEP_LARGE = 50;

function readStoredHeight(): number | null {
  const stored = Number(localStorage.getItem(BOTTOM_SHEET_HEIGHT_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : null;
}

@Component({
  selector: 'app-bottom-sheet',
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss'],
  imports: [SequenceEditorComponent, TranslatePipe],
  host: {
    '[class.is-visible]': 'isOpen()',
    '[class.is-resizing]': 'isResizing()',
    '(window:resize)': 'onWindowResize()',
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

  public isResizing = this.#overlay.panelResizing;

  #viewportHeight = signal(window.innerHeight);
  #customHeight = signal<number | null>(readStoredHeight());
  #renderedHeight = signal(0);
  #pointerId: number | null = null;
  #dragStart = { pointerY: 0, height: 0 };

  public height = computed(() => {
    const customHeight = this.#customHeight();
    return customHeight === null ? null : this.#clampToViewport(customHeight);
  });
  public heightCss = computed(() => {
    const height = this.height();
    return height === null ? null : `${height}px`;
  });
  public minHeight = computed(() => Math.floor(this.#viewportHeight() * BOTTOM_SHEET_MIN_RATIO));
  public maxHeight = computed(() => Math.floor(this.#viewportHeight() * BOTTOM_SHEET_MAX_RATIO));
  public currentHeight = computed(() => this.height() ?? Math.round(this.#renderedHeight()));

  constructor() {
    const observer = new ResizeObserver(entries => {
      const size = entries[0]?.borderBoxSize[0];
      if (size) this.#renderedHeight.set(size.blockSize);
    });
    observer.observe(this.nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  public onWindowResize(): void {
    this.#viewportHeight.set(window.innerHeight);
    if (this.#customHeight() !== null) this.#persist();
  }

  public onHandlePointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    this.#pointerId = event.pointerId;
    this.#dragStart = { pointerY: event.clientY, height: this.currentHeight() };
    this.isResizing.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  public onHandlePointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.#pointerId) return;
    event.preventDefault();
    const delta = this.#dragStart.pointerY - event.clientY;
    this.#customHeight.set(this.#clampToViewport(this.#dragStart.height + delta));
  }

  public onHandlePointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.#pointerId) return;
    this.#pointerId = null;
    this.isResizing.set(false);
    this.#persist();
  }

  public onHandleKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? BOTTOM_SHEET_KEYBOARD_STEP_LARGE : BOTTOM_SHEET_KEYBOARD_STEP;
    const targets: Record<string, number> = {
      ArrowUp: this.currentHeight() + step,
      ArrowDown: this.currentHeight() - step,
      Home: this.minHeight(),
      End: this.maxHeight(),
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.#customHeight.set(this.#clampToViewport(target));
    this.#persist();
  }

  #clampToViewport(value: number): number {
    const min = this.#viewportHeight() * BOTTOM_SHEET_MIN_RATIO;
    const max = this.#viewportHeight() * BOTTOM_SHEET_MAX_RATIO;
    return Math.floor(Math.min(Math.max(value, min), max));
  }

  #persist(): void {
    localStorage.setItem(BOTTOM_SHEET_HEIGHT_STORAGE_KEY, `${this.currentHeight()}`);
  }
}
