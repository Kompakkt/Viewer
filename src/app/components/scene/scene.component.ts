import {AfterViewInit, Component, ElementRef, Input, ViewChild, HostListener} from '@angular/core';

import * as BABYLON from 'babylonjs';

import {ImportService} from '../../services/import/import.service';
import {SkyboxComponent} from '../skybox/skybox.component';
import {CamerasComponent} from '../cameras/cameras.component';
import {LightComponent} from '../light/light.component';
import {UploadModelComponent} from '../upload-model/upload-model.component';
import {AnnotationsComponent} from '../annotations/annotations.component';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css']
})
export class SceneComponent implements AfterViewInit {

  @ViewChild('canvas')
  private canvasRef: ElementRef;

  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;

  constructor(
    private importService: ImportService,
    private skyboxComponent: SkyboxComponent,
    private lightComponent: LightComponent,
    private camerasComponent: CamerasComponent,
    private uploadModelComponent: UploadModelComponent,
    private annotationsComponent: AnnotationsComponent
  ) {
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: Event) {

    this.engine.resize();
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  private getCanvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private createScene() {

    this.canvas = this.getCanvas();

    // load the 3D engine
    this.engine = new BABYLON.Engine(this.canvas, true);

    // create a basic BJS Scene object
    this.scene = new BABYLON.Scene(this.engine);
    this.engine.displayLoadingUI();

    this.skyboxComponent.createSkybox(this.scene, this.canvas);
    this.camerasComponent.createCamera(this.scene, this.canvas);
    this.lightComponent.createLight(this.scene);
    this.uploadModelComponent.loadObject(this.scene);

    this.annotationsComponent.createAnnotations(this.scene, this.canvas);


    this.scene.collisionsEnabled = true;
  }

  private startRendering() {
  }

  ngAfterViewInit() {

    this.createScene();

    const scene = this.scene;

    // run the render loop
    this.engine.runRenderLoop(function () {
      scene.render();
    });

    const that = this;
    setTimeout(function () {
      that.engine.hideLoadingUI();
    }, 3000);

    this.startRendering();
  }

}
