/**
 * @author Benedikt Mildenberger
 */

import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';
import {BabylonService} from '../engine/babylon.service';

@Injectable({
  providedIn: 'root'
})
export class SkyboxService {

  private skybox: BABYLON.Mesh;
  private skyboxes: any[string] = [
    'assets/textures/skybox/darkgrey/darkgrey',
    'assets/textures/skybox/white/white',
    'assets/textures/skybox/lightgrey/lightgrey',
    'assets/textures/skybox/blue/blue',
    'assets/textures/skybox/marineblue/marineblue'
  ];

  constructor(private babylonService: BabylonService) {}

  // ToDo: Preloading and managing of skyboxes should be accomplished by asset manager service
  private preloadSkyboxes() {

    const scene = this.babylonService.getScene();
    for (let skybox of this.skyboxes) {
      new BABYLON.CubeTexture(skybox, scene);
    }
  }

  public setSkyboxMaterial(skyboxID) {

    const scene = this.babylonService.getScene();

    const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyboxes[skyboxID], scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;

    this.skybox.material = skyboxMaterial;
  }

  public createSkybox() {

    this.skybox = BABYLON.Mesh.CreateBox('skyBox', 500.0, this.babylonService.getScene());

    this.preloadSkyboxes();

    this.setSkyboxMaterial(0);
  }
}
