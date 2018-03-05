import { AfterViewInit, Component, ElementRef, Input, ViewChild, HostListener } from '@angular/core';

import * as BABYLON from 'babylonjs';
import {ImportService} from "../../services/import/import.service";

@Component({
  selector: 'scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css']
})
export class SceneComponent implements AfterViewInit {

  @ViewChild('canvas')
  private canvasRef: ElementRef;

  private canvas : HTMLCanvasElement;
  private engine : BABYLON.Engine;
  private scene : BABYLON.Scene;

  constructor(private importService: ImportService) {

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

    this.importService.loadObj(this.scene, "assets/models/testmodel/", "testmodel.obj").then(
      (success) => {});

    this.scene.clearColor = new BABYLON.Color4(0, 0, 0, .0);

    this.createCamera();

    this.createLight();
  }

  private createLight() {

    // create a basic light, aiming 0,1,0 - meaning, to the sky
    let light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0,1,0), this.scene);
    light.groundColor = new BABYLON.Color3(.1, .1, .1);
  }

  private createCamera() {

    let camera = new BABYLON.ArcRotateCamera('camera1', 0, 0, 0, new BABYLON.Vector3(10, 0, 30), this.scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(this.canvas, false);
  }

  private startRendering() {
  }

  public onMouseDown(event: MouseEvent) {

    /*
    let pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

    if (pickResult.pickedMesh) {
      pickResult.pickedMesh.showBoundingBox = !pickResult.pickedMesh.showBoundingBox;
    }

    console.log(pickResult);
    */
  }

  public onMouseUp(event: MouseEvent) {
  }

  @HostListener('window:resize', ['$event'])
  public onResize(event: Event) {

    this.engine.resize();
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    console.log("onResize: " + this.canvas.clientWidth + ", " + this.canvas.clientHeight);
  }

  @HostListener('document:keypress', ['$event'])
  public onKeyPress(event: KeyboardEvent) {
    console.log("onKeyPress: " + event.key);
  }

  ngAfterViewInit() {

    this.createScene();

    let scene = this.scene;

    // run the render loop
    this.engine.runRenderLoop(function(){
      scene.render();
    });
    this.createLight();
    this.createCamera();
    this.startRendering();
  }

}
