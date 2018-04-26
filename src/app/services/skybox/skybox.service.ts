/**
 * @author Benedikt Mildenberger
 */

import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';

@Injectable()
export class SkyboxService {

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;
  private skybox: BABYLON.Mesh;
  private skyboxMaterial: BABYLON.StandardMaterial;
  private skyURL: string;
  private skyboxes: any;

  public insert: number;

  constructor() {
  }

  private preloadSkyboxes() {

    this.skyURL = this.skyboxes[0];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyURL = this.skyboxes[1];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyURL = this.skyboxes[2];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
  }

  public setSkyboxMaterial() {

    this.skyURL = this.skyboxes[this.insert];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    this.skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    this.skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    this.skyboxMaterial.disableLighting = true;
    this.skybox.material = this.skyboxMaterial;
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
  }

}
