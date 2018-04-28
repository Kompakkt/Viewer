/**
 * @author Benedikt Mildenberger
 */

import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';

@Injectable()
export class SkyboxService {

  private scene: BABYLON.Scene;
  private skybox: BABYLON.Mesh;
  private skyboxes: any[string] = [
    'https://www.babylonjs-playground.com/textures/skybox',
    'https://www.babylonjs-playground.com/textures/skybox2',
    'https://www.babylonjs-playground.com/textures/skybox3'
  ];

  constructor() {}

  // ToDo: Preloading and managing of skyboxes should be accomplished by asset manager service
  private preloadSkyboxes() {

    for (let skybox of this.skyboxes) {
      new BABYLON.CubeTexture(skybox, this.scene);
    }
  }

  public setSkyboxMaterial(skyboxID) {

    const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', this.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyboxes[skyboxID], this.scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;

    this.skybox.material = skyboxMaterial;
  }

  public createSkybox(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {

    this.scene = scene;
    this.skybox = BABYLON.Mesh.CreateBox('skyBox', 500.0, this.scene);

    this.preloadSkyboxes();

    this.setSkyboxMaterial(0);
  }
}
