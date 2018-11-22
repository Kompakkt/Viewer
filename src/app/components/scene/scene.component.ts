import {AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild} from '@angular/core';

import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {AnnotationService} from '../../services/annotation/annotation.service';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css']
})
export class SceneComponent implements AfterViewInit {

  @Input() modelFileName: string;
  @Input() modelDirectory: string;
  @Input() backgroundImage: string;

  @ViewChild('canvas') private canvasRef: ElementRef;

  @HostListener('window:resize', ['$event'])
  public onResize() {
    this.babylonService.resize();
  }

  constructor(
    private cameraService: CameraService,
    private babylonService: BabylonService,
    private annotationService: AnnotationService
  ) {
  }

  private bootstrap() {

    this.babylonService.bootstrap(this.canvasRef.nativeElement, true);
    this.babylonService.setClearColor(0.2, 0.2, 0.2, 0.8);

    if (this.backgroundImage) {
      this.babylonService.setBackgroundImage(this.backgroundImage);
    }

    this.babylonService.createHemisphericLight('light1', {x: 0, y: 1, z: 0});

    this.cameraService.bootstrap();

    // this.babylonService.loadModel(this.modelDirectory, this.modelFileName);
  }

  ngAfterViewInit() {

    this.bootstrap();

    const scene = this.babylonService.getScene();
    const annotationServive = this.annotationService;

    this.babylonService.getEngine().runRenderLoop(function () {
      scene.render();
    });
  }
}
