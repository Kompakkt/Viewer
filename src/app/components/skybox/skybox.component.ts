import {Component, OnInit} from '@angular/core';
import * as BABYLON from 'babylonjs';

@Component({
  selector: 'app-skybox',
  templateUrl: './skybox.component.html',
  styleUrls: ['./skybox.component.css']
})
export class SkyboxComponent implements OnInit {

  public createSkybox(_scene, _canvas) {

    let skybox = BABYLON.Mesh.CreateBox('skyBox', 500.0, _scene);
    let skyboxMaterial = new BABYLON.StandardMaterial('skyBox', _scene);
    skyboxMaterial.backFaceCulling = false;


    let skyboxes = [
      'https://www.babylonjs-playground.com/textures/skybox',
      'https://www.babylonjs-playground.com/textures/skybox2',
      'https://www.babylonjs-playground.com/textures/skybox4'
    ];

    let _insert = 0;
    let skyURL;

    //set defaultskybox
    window.onload = function() {
      skyURL = skyboxes[0];
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
      skyURL = skyboxes[1];
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
      skyURL = skyboxes[2];
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
      skyURL = skyboxes[_insert];
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
      skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
      skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.disableLighting = true;
      skybox.material = skyboxMaterial;
    }

    //set box with button
    document.getElementById('sky').onclick = function () {
      _canvas.focus();
      _insert = 0;
      skyURL = skyboxes[_insert];
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
      skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
      skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.disableLighting = true;
      skybox.material = skyboxMaterial;
    };
    document.getElementById('urban').onclick = function () {
      _canvas.focus();
      _insert = 1;
      skyURL = skyboxes[_insert];
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
      skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
      skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.disableLighting = true;
      skybox.material = skyboxMaterial;
    };
    document.getElementById('fantasy').onclick = function () {
      _canvas.focus();
      _insert = 2;
      skyURL = skyboxes[_insert];
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyURL, _scene);
      skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
      skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.disableLighting = true;
      skybox.material = skyboxMaterial;
    };
  }

  constructor() {
  }

  ngOnInit() {
  }

}
