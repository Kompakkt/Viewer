import {AfterViewInit, Component, ElementRef, Input, ViewChild, HostListener} from '@angular/core';

import {SkyboxService} from '../../services/skybox/skybox.service';
import {AnnotationsComponent} from '../annotations/annotations.component';
import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/engine/babylon.service';
import {MessageService} from '../../services/message/message.service';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css']
})
export class SceneComponent implements AfterViewInit {

  @Input() modelFileName: string;
  @Input() modelDirectory: string;

  @ViewChild('canvas')
  private canvasRef: ElementRef;

  private canvas: HTMLCanvasElement;

  constructor(
    private skyboxService: SkyboxService,
    private cameraService: CameraService,
    private annotationsComponent: AnnotationsComponent,
    private messageService: MessageService,
    private babylonService: BabylonService
  ) {
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: Event) {

    this.babylonService.getEngine().resize();
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  private getCanvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private initialize() {

    this.canvas = this.getCanvas();

    this.babylonService.startup(this.getCanvas(), true);

    const scene = this.babylonService.getScene();

    this.skyboxService.createSkybox();

    this.cameraService.createCameras(this.canvas);

    this.babylonService.createHemisphericLight('light1', {x: 0, y: 1, z: 0});

    const that = this;

    this.babylonService.loadModel(scene, this.modelDirectory, this.modelFileName).then(function() {
      that.annotationsComponent.createAnnotations();
    }, function(error) {
      that.messageService.error(error.message);
    });

    scene.collisionsEnabled = true;
  }

  ngAfterViewInit() {

    this.initialize();

    const scene = this.babylonService.getScene();

    this.babylonService.getEngine().runRenderLoop(function () {
      scene.render();
    });
  }
}
