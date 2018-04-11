import { Component, OnInit } from '@angular/core';
import * as BABYLON from "babylonjs";

@Component({
  selector: 'app-skybox',
  templateUrl: './skybox.component.html',
  styleUrls: ['./skybox.component.css']
})
export class SkyboxComponent implements OnInit {

  public createSkybox(_scene) {
    let skybox = BABYLON.Mesh.CreateBox("skyBox", 500.0, _scene);
    let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", _scene);
    skyboxMaterial.backFaceCulling = false;
    let skyURL = "https://www.babylonjs-playground.com/textures/skybox3";
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
  }

  constructor() { }

  ngOnInit() {
  }

}
