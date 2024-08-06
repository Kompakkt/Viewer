import { AfterViewInit, Component, HostListener, ViewContainerRef } from '@angular/core';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { AsyncPipe } from '@angular/common';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { SidenavMenuComponent } from '../sidenav-menu/sidenav-menu.component';
import { MenuComponent } from '../menu/menu.component';
import { AnnotationwalkthroughComponent } from '../entity-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import { AnnotationComponent } from '../entity-feature-annotations/annotation/annotation.component';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
  standalone: true,
  imports: [
    AnnotationComponent,
    AnnotationwalkthroughComponent,
    MenuComponent,
    SidenavMenuComponent,
    SidenavComponent,
    AsyncPipe,
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

  ngAfterViewInit() {
    this.setupCanvas();
  }
}
