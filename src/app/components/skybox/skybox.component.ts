import {Component, OnInit} from '@angular/core';
import * as BABYLON from 'babylonjs';

@Component({
  selector: 'app-skybox',
  templateUrl: './skybox.component.html',
  styleUrls: ['./skybox.component.css']
})
export class SkyboxComponent implements OnInit {

  private setSkyboxMaterial(skyboxMaterial: BABYLON.StandardMaterial, skybox: BABYLON.Mesh,
                            skyURL: string, scene: BABYLON.Scene) {
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
  }

  private changeSkyboxSky(canvas: HTMLCanvasElement, insert: number, skyboxes: any,
                          skyboxMaterial: BABYLON.StandardMaterial, skybox: BABYLON.Mesh,
                          skyURL: string, scene: BABYLON.Scene,) {
    canvas.focus();
    insert = 0;
    skyURL = skyboxes[insert];
    this.setSkyboxMaterial(skyboxMaterial, skybox, skyURL, scene)
  }

  private changeSkyboxUrban(canvas: HTMLCanvasElement, insert: number, skyboxes: any,
                            skyboxMaterial: BABYLON.StandardMaterial, skybox: BABYLON.Mesh,
                            skyURL: string, scene: BABYLON.Scene,) {
    canvas.focus();
    insert = 1;
    skyURL = skyboxes[insert];
    this.setSkyboxMaterial(skyboxMaterial, skybox, skyURL, scene)
  }

  private changeSkyboxFantasy(canvas: HTMLCanvasElement, insert: number, skyboxes: any,
                              skyboxMaterial: BABYLON.StandardMaterial, skybox: BABYLON.Mesh,
                              skyURL: string, scene: BABYLON.Scene,) {
    canvas.focus();
    insert = 1;
    skyURL = skyboxes[insert];
    this.setSkyboxMaterial(skyboxMaterial, skybox, skyURL, scene)
  }

  public createSkybox(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {

    const skybox = BABYLON.Mesh.CreateBox('skyBox', 500.0, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial('skyBox', scene);
    skyboxMaterial.backFaceCulling = false;


    const skyboxes = [
      'https://www.babylonjs-playground.com/textures/skybox',
      'https://www.babylonjs-playground.com/textures/skybox2',
      'https://www.babylonjs-playground.com/textures/skybox4'
    ];

    let insert = 0;
    let skyURL;

    // set defaultskybox
    skyURL = skyboxes[0];
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, scene);
    skyURL = skyboxes[1];
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, scene);
    skyURL = skyboxes[2];
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, scene);
    skyURL = skyboxes[insert];
    this.setSkyboxMaterial(skyboxMaterial, skybox, skyURL, scene)


    // set box with button
    this.changeSkyboxSky(canvas, insert, skyboxes, skyboxMaterial, skybox, skyURL, scene)
    this.changeSkyboxUrban(canvas, insert, skyboxes, skyboxMaterial, skybox, skyURL, scene)
    this.changeSkyboxFantasy(canvas, insert, skyboxes, skyboxMaterial, skybox, skyURL, scene)
  }

  constructor() {
  }

  ngOnInit() {
  }

}
