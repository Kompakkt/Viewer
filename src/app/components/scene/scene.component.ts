import { AsyncPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  HostListener,
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
import { BehaviorSubject, combineLatest, from, map, of } from 'rxjs';
import { ButtonComponent, ButtonRowComponent } from '@kompakkt/komponents';
import { GuideComponent } from '../guide/guide.component';
import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';
import { MediaPlayerMenuComponent } from '../media-player-menu/media-player-menu.component';

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
    AsyncPipe,
    ButtonComponent,
    ButtonRowComponent,
    MediaPlayerMenuComponent,
    GuideComponent,
    BottomSheetComponent,
  ],
  host: {
    '[style.--bottom-sheet-offset.px]': 'offsetBinding()',
  },
})
export class SceneComponent implements AfterViewInit {
  @HostListener('window:resize')
  public onResize() {
    this.babylon.resize();
  }

  constructor(
    private babylon: BabylonService,
    public processing: ProcessingService,
    public annotations: AnnotationService,
    private viewContainerRef: ViewContainerRef,
  ) {}

  #overlay = inject(OverlayService);
  #sidenav = toSignal(this.#overlay.sidenav$);
  #isSequenceEditorVisible = computed(
    () => this.#sidenav()?.mode === 'animations' && this.#sidenav()?.open,
  );

  bottomSheetEl = viewChild<BottomSheetComponent>('bottomSheet');

  #actualOffset = signal(0);
  offsetBinding = computed(() => (this.#isSequenceEditorVisible() ? this.#actualOffset() : 0));

  private async setupCanvas() {
    this.babylon.attachCanvas(this.viewContainerRef);
    return this.processing.bootstrap().then(() => this.babylon.resize());
  }

  warningIgnored$ = new BehaviorSubject<boolean>(false);

  showWebGPUUnsupportedWarning$ = combineLatest({
    warningIgnored: this.warningIgnored$,
    isSupported: from(this.babylon.checkWebGPUSupport()),
    isNeeded: this.processing.mediaType$.pipe(map(type => type === 'splat')),
  }).pipe(
    map(({ warningIgnored, isSupported, isNeeded }) => !isSupported && isNeeded && !warningIgnored),
  );

  ngAfterViewInit() {
    void this.setupCanvas();

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
  }
}
