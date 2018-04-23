import {Component, OnInit} from '@angular/core';
import * as BABYLON from 'babylonjs';

@Component({
  selector: 'app-skybox',
  templateUrl: './skybox.component.html',
  styleUrls: ['./skybox.component.css']
})
export class SkyboxComponent implements OnInit {

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;
  private skybox: BABYLON.Mesh;
  private skyboxMaterial: BABYLON.StandardMaterial;
  private insert: number;
  private skyURL: string;
  private skyboxes: any;

  constructor() {
  }

  private setSkyboxMaterial() {
    this.skyURL = this.skyboxes[this.insert];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    this.skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    this.skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    this.skyboxMaterial.disableLighting = true;
    this.skybox.material = this.skyboxMaterial;
  }

  private preloadSkyboxes() {
    this.skyURL = this.skyboxes[0];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyURL = this.skyboxes[1];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyURL = this.skyboxes[2];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
  }

  private changeSkybox() {
    document.getElementById("sky").addEventListener('click', () => this.insert = 0, false);
    document.getElementById("sky").addEventListener('click', () => this.setSkyboxMaterial(), false);
    document.getElementById("urban").addEventListener('click', () => this.insert = 1, false);
    document.getElementById("urban").addEventListener('click', () => this.setSkyboxMaterial(), false);
    document.getElementById("fantasy").addEventListener('click', () => this.insert = 2, false);
    document.getElementById("fantasy").addEventListener('click', () => this.setSkyboxMaterial(), false);
  }

  public createSkybox(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {

    this.scene = scene;
    this.canvas = canvas;

    this.skybox = BABYLON.Mesh.CreateBox('skyBox', 500.0, this.scene);
    this.skyboxMaterial = new BABYLON.StandardMaterial('skyBox', this.scene);
    this.skyboxMaterial.backFaceCulling = false;


    this.skyboxes = [
      'https://www.babylonjs-playground.com/textures/skybox',
      'https://www.babylonjs-playground.com/textures/skybox2',
      'https://www.babylonjs-playground.com/textures/skybox3'
    ];


    this.insert = 0;

    this.preloadSkyboxes();

    this.setSkyboxMaterial();

    this.changeSkybox();
  }

  ngOnInit() {
  }

}
