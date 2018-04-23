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
    this.insert = 0;
  }

  private setSkyboxMaterial() {
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    this.skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    this.skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    this.skyboxMaterial.disableLighting = true;
    this.skybox.material = this.skyboxMaterial;
  }

  private changeSkyboxSky() {
    this.insert = 0;
    this.skyURL = this.skyboxes[this.insert];
    this.setSkyboxMaterial()
  }

  private changeSkyboxUrban() {
    this.insert = 1;
    this.skyURL = this.skyboxes[this.insert];
    this.setSkyboxMaterial()
  }

  private changeSkyboxFantasy() {
    this.insert = 2;
    this.skyURL = this.skyboxes[this.insert];
    this.setSkyboxMaterial()
  }

  public createSkybox() {

    const skybox = BABYLON.Mesh.CreateBox('skyBox', 500.0, this.scene);
    this.skyboxMaterial = new BABYLON.StandardMaterial('skyBox', this.scene);
    this.skyboxMaterial.backFaceCulling = false;


    this.skyboxes = [
      'https://www.babylonjs-playground.com/textures/skybox',
      'https://www.babylonjs-playground.com/textures/skybox2',
      'https://www.babylonjs-playground.com/textures/skybox4'
    ];

    this.insert = 0;

    // set defaultskybox
    this.skyURL = this.skyboxes[0];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyURL = this.skyboxes[1];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyURL = this.skyboxes[2];
    this.skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(this.skyURL, this.scene);
    this.skyURL = this.skyboxes[this.insert];
    this.setSkyboxMaterial()
    console.log("done")


    // set box with button
    this.changeSkyboxSky()
    this.changeSkyboxUrban()
    this.changeSkyboxFantasy()
  }

  ngOnInit() {
  }

}
