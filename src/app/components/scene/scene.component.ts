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
  // show or not show menu
  public isLightMode: boolean;

  @HostListener('window:resize', ['$event'])
  public onResize() {
    this.babylonService.resize();
  }

  constructor(
    private babylonService: BabylonService,
    private processingService: ProcessingService,
    public annotationService: AnnotationService,
    private viewContainerRef: ViewContainerRef,
  ) {
    this.isLightMode = this.processingService.isLightMode;
  }

  private setupCanvas() {
    this.babylonService.attachCanvas(this.viewContainerRef);
    this.babylonService.resize();
    this.processingService.bootstrap();
  }

  ngAfterViewInit() {

    this.processingService.lightMode.subscribe(isLightMode => {
    this.isLightMode = isLightMode;
    });

    this.setupCanvas();
  }
}
