/**
 * @author Benedikt Mildenberger
 */

import {AfterViewInit, Component, ElementRef, Input, ViewChild, HostListener} from '@angular/core';

import {SkyboxService} from '../../services/skybox/skybox.service';
import {AnnotationsComponent} from '../annotations/annotations.component';
import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/engine/babylon.service';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css']
})
export class SceneComponent implements AfterViewInit {

  @ViewChild('canvas')
  private canvasRef: ElementRef;

  private canvas: HTMLCanvasElement;

  constructor(
    private skyboxService: SkyboxService,
    private cameraService: CameraService,
    private annotationsComponent: AnnotationsComponent,
    private babylonService: BabylonService
  ) {}

  @HostListener('window:resize', ['$event'])
  public onResize(event: Event) {

    this.babylonService.getEngine().resize();
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  private getCanvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private createScene() {

    this.canvas = this.getCanvas();

    this.babylonService.createEngine(this.canvas, true);
    const scene = this.babylonService.createScene();

    this.skyboxService.createSkybox(scene, this.canvas);
    this.cameraService.createCamera(scene, this.canvas);

    this.babylonService.createHemisphericLight('light1', {x: 0, y: 1, z: 0});

    this.babylonService.loadObject('', 'assets/models/testmodel/', 'testmodel.obj');

    this.annotationsComponent.createAnnotations(scene, this.canvas);

    scene.collisionsEnabled = true;
  }

  ngAfterViewInit() {

    this.createScene();

    const scene = this.babylonService.getScene();

    this.babylonService.getEngine().runRenderLoop(function () {
      scene.render();
    });
  }
}
