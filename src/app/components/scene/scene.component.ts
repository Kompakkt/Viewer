import { AsyncPipe } from '@angular/common';
import { AfterViewInit, Component, HostListener, ViewContainerRef } from '@angular/core';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { AnnotationMarkerComponent } from '../entity-feature-annotations/annotation/annotation-marker.component';
import { AnnotationComponent } from '../entity-feature-annotations/annotation/annotation.component';
import { AnnotationwalkthroughComponent } from '../entity-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import { MenuComponent } from '../menu/menu.component';
import { SidenavMenuComponent } from '../sidenav-menu/sidenav-menu.component';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { BehaviorSubject, combineLatest, from, map, of } from 'rxjs';
import { ButtonComponent, ButtonRowComponent } from 'komponents';
import { GuideComponent } from '../guide/guide.component';
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
  ],
})
export class SceneComponent implements AfterViewInit {
  @HostListener('window:resize', ['$event'])
  public onResize() {
    this.babylon.resize();
  }

  constructor(
    private babylon: BabylonService,
    public processing: ProcessingService,
    public annotations: AnnotationService,
    private viewContainerRef: ViewContainerRef,
  ) {}

  private setupCanvas() {
    this.babylon.attachCanvas(this.viewContainerRef);
    this.processing.bootstrap().then(() => this.babylon.resize());
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
    this.setupCanvas();
  }
}
