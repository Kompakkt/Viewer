import {
  AfterViewInit,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { OverlayService } from '../../services/overlay/overlay.service';
import { AnnotationMarkerComponent } from '../entity-feature-annotations/annotation/annotation-marker.component';
import { AnnotationComponent } from '../entity-feature-annotations/annotation/annotation.component';
import { AnnotationwalkthroughComponent } from '../entity-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import { MenuComponent } from '../menu/menu.component';
import { SidenavMenuComponent } from '../sidenav-menu/sidenav-menu.component';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { from } from 'rxjs';
import { ButtonComponent, ButtonRowComponent } from '@kompakkt/komponents';
import { GuideComponent } from '../guide/guide.component';
import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';
import { MediaPlayerMenuComponent } from '../media-player-menu/media-player-menu.component';
import { ActivatedRoute } from '@angular/router';
import { skip } from 'rxjs';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
  imports: [
    AnnotationComponent,
    AnnotationMarkerComponent,
    AnnotationwalkthroughComponent,
    MenuComponent,
    SidenavMenuComponent,
    SidenavComponent,
    ButtonComponent,
    ButtonRowComponent,
    MediaPlayerMenuComponent,
    GuideComponent,
    BottomSheetComponent,
  ],
  host: {
    '[style.--bottom-sheet-offset.px]': 'offsetBinding()',
    '(window:resize)': 'this.babylon.resize()',
  },
})
export class SceneComponent implements AfterViewInit {
  #viewContainerRef = inject(ViewContainerRef);
  #route = inject(ActivatedRoute);
  babylon = inject(BabylonService);

  #afterInit = signal(false);
  #queryParams = toSignal(this.#route.queryParams.pipe(skip(1)));
  #bootstrapRef = effect(() => {
    const params = this.#queryParams();
    const afterInit = this.#afterInit();
    if (!afterInit || !params) return;
    this.babylon.attachCanvas(this.#viewContainerRef);
    this.#bootstrapRef.destroy();
    return this.processing.bootstrap(params).then(() => {
      this.babylon.resize();
    });
  })

  processing = inject(ProcessingService);
  annotations = inject(AnnotationService);

  #overlay = inject(OverlayService);
  // TODO: Move this decision to a BottomSheetService for centralized decisions
  #isSequenceEditorVisible = computed(
    () =>
      this.#overlay.sidenav()?.mode === 'animations' &&
      this.#overlay.sidenav()?.open &&
      this.processing.mode() === 'annotation',
  );

  bottomSheetEl = viewChild<BottomSheetComponent>('bottomSheet');

  #actualOffset = signal(0);
  offsetBinding = computed(() => (this.#isSequenceEditorVisible() ? this.#actualOffset() : 0));

  #webGpuSupport$ = from(this.babylon.checkWebGPUSupport());
  #webGpuSupport = toSignal(this.#webGpuSupport$);
  #webGpuNeeded = computed(() => this.processing.mediaType() === 'splat');
  #webGpuWarningIgnored = signal<boolean>(
    (() => {
      // Check if the user has ignored the WebGPU warning && if the last ignore is older than 1 month
      const ignored = localStorage.getItem('webGpuWarningIgnored');
      try {
        const date = new Date(ignored ?? '');
        const now = new Date();
        return date.getTime() + 30 * 24 * 60 * 60 * 1000 < now.getTime();
      } catch {
        return false;
      }
    })(),
  );
  showWebGPUUnsupportedWarning = computed(() => {
    return !this.#webGpuSupport() && this.#webGpuNeeded() && !this.#webGpuWarningIgnored();
  });

  ignoreWebGPUWarning() {
    this.#webGpuWarningIgnored.set(true);
    localStorage.setItem('webGpuWarningIgnored', new Date().toISOString());
  }

  ngAfterViewInit() {
    const waitForBottomSheet = () => {
      const bottomSheet = this.bottomSheetEl();
      if (bottomSheet) {
        console.log('bottomSheet', bottomSheet);
        const observer = new ResizeObserver(entries => {
          for (const entry of entries) {
            const size = entry.borderBoxSize[0];
            this.#actualOffset.set(size.blockSize);
          }
        });
        observer.observe(bottomSheet.nativeElement, { box: 'border-box' });
      } else {
        setTimeout(waitForBottomSheet, 100);
      }
    };
    waitForBottomSheet();

    this.#afterInit.set(true);  }
}
