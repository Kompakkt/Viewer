import { Component, computed, effect, inject, signal } from '@angular/core';
import { OverlayService } from '../../services/overlay/overlay.service';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { CompilationBrowserComponent } from '../compilation-browser/compilation-browser.component';
import { EntityFeatureAnimationsComponent } from '../entity-feature-animations/entity-feature-animations.component';
import { EntityFeatureSettingsComponent } from '../entity-feature-settings/entity-feature-settings.component';
import { AnnotationsEditorComponent } from '../entity-feature-annotations/annotations-editor/annotations-editor.component';
import { PointCloudSettingsComponent } from '../point-cloud-settings/point-cloud-settings.component';

const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebarWidth';
const SIDEBAR_MIN_WIDTH = 320;
const SIDEBAR_DEFAULT_RATIO = 0.27;
const SIDEBAR_DEFAULT_MAX_WIDTH = 400;
const SIDEBAR_KEYBOARD_STEP = 10;
const SIDEBAR_KEYBOARD_STEP_LARGE = 50;

function readStoredWidth(): number | null {
  const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : null;
}

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  imports: [
    TranslatePipe,
    AnnotationsEditorComponent,
    EntityFeatureSettingsComponent,
    EntityFeatureAnimationsComponent,
    CompilationBrowserComponent,
    PointCloudSettingsComponent,
  ],
  host: {
    '[class.is-open]': 'isReady()',
    '[class.is-resizing]': 'isResizing()',
    '(window:resize)': 'onWindowResize()',
  },
})
export class SidenavComponent {
  #overlay = inject(OverlayService);

  public isOpen = computed(() => this.#overlay.sidenav().open);
  public mode = computed(() => this.#overlay.sidenav().mode);
  public isReady = computed(() => this.isOpen() && !!this.mode());

  #viewportWidth = signal(window.innerWidth);
  #customWidth = signal<number | null>(readStoredWidth());
  #pointerId: number | null = null;

  public isResizing = this.#overlay.panelResizing;

  public width = computed(() => this.#clampToViewport(this.#customWidth() ?? this.#defaultWidth()));
  public minWidth = computed(() => Math.min(SIDEBAR_MIN_WIDTH, this.maxWidth()));
  public maxWidth = computed(() => Math.floor(this.#viewportWidth() / 2));

  constructor() {
    effect(() => {
      if (this.#customWidth() === null) {
        document.documentElement.style.removeProperty('--sidebar-width');
        return;
      }
      document.documentElement.style.setProperty('--sidebar-width', `${this.width()}px`);
    });
  }

  public onWindowResize(): void {
    this.#viewportWidth.set(window.innerWidth);
    if (this.#customWidth() !== null) this.#persist();
  }

  public onHandlePointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    this.#pointerId = event.pointerId;
    this.isResizing.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  public onHandlePointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.#pointerId) return;
    event.preventDefault();
    this.#customWidth.set(this.#clampToViewport(event.clientX));
  }

  public onHandlePointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.#pointerId) return;
    this.#pointerId = null;
    this.isResizing.set(false);
    this.#persist();
  }

  public onHandleKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? SIDEBAR_KEYBOARD_STEP_LARGE : SIDEBAR_KEYBOARD_STEP;
    const targets: Record<string, number> = {
      ArrowLeft: this.width() - step,
      ArrowRight: this.width() + step,
      Home: this.minWidth(),
      End: this.maxWidth(),
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.#customWidth.set(this.#clampToViewport(target));
    this.#persist();
  }

  #defaultWidth(): number {
    const preferred = this.#viewportWidth() * SIDEBAR_DEFAULT_RATIO;
    return Math.round(Math.min(Math.max(preferred, SIDEBAR_MIN_WIDTH), SIDEBAR_DEFAULT_MAX_WIDTH));
  }

  #clampToViewport(value: number): number {
    const max = this.#viewportWidth() / 2;
    const min = Math.min(SIDEBAR_MIN_WIDTH, max);
    return Math.floor(Math.min(Math.max(value, min), max));
  }

  #persist(): void {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, `${this.width()}`);
  }
}
