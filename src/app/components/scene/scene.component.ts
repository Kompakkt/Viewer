import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
})
export class SceneComponent implements AfterViewInit {

  @ViewChild('canvas') private canvasRef: ElementRef;

  @HostListener('window:resize', ['$event'])

  public onResize() {
    this.babylonService.resize();
  }

  constructor(private babylonService: BabylonService,
              private catalogueService: CatalogueService,
              public annotationService: AnnotationService) {
  }

  ngAfterViewInit() {

    this.babylonService.updateCanvas(this.canvasRef.nativeElement);
    this.catalogueService.bootstrap();
  }
}
