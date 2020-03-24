import {
  AfterViewInit,
  Component,
  HostListener,
  ViewContainerRef,
} from '@angular/core';

import { AnnotationService } from '../../services/annotation/annotation.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
})
export class SceneComponent implements AfterViewInit {
  @HostListener('window:resize', ['$event'])
  public onResize() {
    this.babylon.resize();
  }

  public isReady = false;

  constructor(
    private babylon: BabylonService,
    public processing: ProcessingService,
    public annotations: AnnotationService,
    private viewContainerRef: ViewContainerRef,
  ) {
    setTimeout(() => {
      this.processing.bootstrapped$.subscribe(
        change => (this.isReady = change),
      );
    }, 0);
  }

  private setupCanvas() {
    this.babylon.attachCanvas(this.viewContainerRef);
    this.processing.bootstrap();
    this.babylon.resize();
  }

  get currentAnnotations() {
    return this.annotations.currentAnnotations;
  }

  ngAfterViewInit() {
    this.setupCanvas();
  }
}
