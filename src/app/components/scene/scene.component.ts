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

    this.createCamera();
    this.createLight();
    this.loadObject();
  }

  private createCamera() {

    let camera1 = new BABYLON.ArcRotateCamera("camera1", 0, 0.8, 100, BABYLON.Vector3.Zero(), this.scene);
    camera1.setTarget(BABYLON.Vector3.Zero());
    camera1.attachControl(this.canvas, true);

    let camera2 = new BABYLON.UniversalCamera("camera2", new BABYLON.Vector3(0, 20, -50), this.scene);

    // Skybox
    let skybox = BABYLON.Mesh.CreateBox("skyBox", 500.0, this.scene);
    let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
    skyboxMaterial.backFaceCulling = false;
    let skyURL = "https://www.babylonjs-playground.com/textures/skybox3";
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, this.scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;

    // add buttons
    let buttonbox = document.createElement('div');
    buttonbox.id = "buttonbox";
    buttonbox.style.position = "absolute";
    buttonbox.style.top = "140px";
    buttonbox.style.left = "85%";
    buttonbox.style.border = "5pt inset blue";
    buttonbox.style.padding = "2pt";
    buttonbox.style.paddingRight = "2pt";
    buttonbox.style.width = "10em";
    buttonbox.style.display = "block";
    document.body.appendChild(buttonbox);


    let tTag = document.createElement('div');
    tTag.id = "choose";
    tTag.textContent = "Cams:";
    tTag.style.textAlign = "center";
    tTag.style.border = "2pt solid gold";
    tTag.style.marginLeft = "1.5pt";
    tTag.style.marginTop = "3pt";
    tTag.style.marginBottom = "2pt";
    tTag.style.backgroundColor = "dodgerblue";
    tTag.style.width = "96%";
    tTag.style.fontSize = "1.0em";
    tTag.style.color = "white";
    buttonbox.appendChild(tTag);


    let b8 = document.createElement('button');
    b8.id = "uni";
    b8.textContent = "ArcRotate Cam";
    b8.style.display = "block";
    b8.style.width = "100%";
    b8.style.fontSize = "1.1em";
    b8.style.cursor = "pointer";
    buttonbox.appendChild(b8);
    b8.onclick = function() {
      setCamArcRotate();
    }

    let b9 = document.createElement('button');
    b9.id = "arc";
    b9.textContent = "Universal Cam";
    b9.style.display = "block";
    b9.style.width = "100%";
    b9.style.fontSize = "1.1em";
    b9.style.cursor = "pointer";
    buttonbox.appendChild(b9);
    b9.onclick = function() {
      setCamUniversal();
    }

    this.scene.onDispose =()=>{
      if (document.getElementById('buttonbox')) {
        document.getElementById('buttonbox').parentNode.removeChild(document.getElementById('buttonbox'));
      }
    }

//-----------------------------------------------------------
// camera activators

    let setCamArcRotate = function() {
      this.scene.activeCamera = camera1;
      console.log("!works")
      camera1.attachControl(this.canvas, true);
    };
    let setCamUniversal = function() {
      this.scene.activeCamera = camera2;
      camera2.attachControl(this.canvas, true);
    };

  }

  private createLight() {

    let light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1,0,1), this.scene);
    light.groundColor = new BABYLON.Color3(.1, .1, .1);
  }

  private loadObject(){

    BABYLON.SceneLoader.ImportMesh("", "assets/models/testmodel/", "testmodel.obj", this.scene, function (newMeshes) {});
  }

  private startRendering() {
  }

  /*public onMouseDown(event: MouseEvent) {

    /*
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
  }*/

  ngAfterViewInit() {

    this.createScene();

    let scene = this.scene;

    // run the render loop
    this.engine.runRenderLoop(function(){
      scene.render();
    });
    this.createLight();
    this.createCamera();
    this.loadObject();
    this.startRendering();
  }

}
