import { AfterViewInit, Component, ElementRef, Input, ViewChild, HostListener } from '@angular/core';

import * as BABYLON from 'babylonjs';

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

  constructor() {
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

    this.scene.clearColor = new BABYLON.Color4(0, 0, 0, .7);

    this.createCamera();

    this.createLight();

    // create a built-in "sphere" shape; its constructor takes 6 params: name, segment, diameter, scene, updatable, sideOrientation
    let sphere = BABYLON.Mesh.CreateSphere('sphere1', 16, 2, this.scene);

    // move the sphere upward 1/2 of its height
    sphere.position.y = 1;

    // create a built-in "ground" shape; its constructor takes the same 6 params : name, width, height, subdivision, scene, updatable
    let ground = BABYLON.Mesh.CreateGround('ground1', 5, 5, 2, this.scene);
  }

  private createLight() {

    // create a basic light, aiming 0,1,0 - meaning, to the sky
    let light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0,1,0), this.scene);
    light.groundColor = new BABYLON.Color3(.1, .1, .1);
  }

  private createCamera() {

    // create a FreeCamera, and set its position to (x:0, y:5, z:-10)
    let camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5,-10), this.scene);
    // target the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());
    // attach the camera to the canvas
    camera.attachControl(this.canvas, false);
  }

  private startRendering() {
  }

  public onMouseDown(event: MouseEvent) {

    let pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

    if (pickResult.pickedMesh) {
      pickResult.pickedMesh.showBoundingBox = !pickResult.pickedMesh.showBoundingBox;
    }

    console.log(pickResult);
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
