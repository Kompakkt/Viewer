import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-upload-model',
  templateUrl: './upload-model.component.html',
  styleUrls: ['./upload-model.component.css']
})
export class UploadModelComponent implements OnInit {

  public loadObject(_scene) {
    BABYLON.SceneLoader.ImportMesh("", "assets/models/testmodel/", "testmodel.obj", _scene, function (newMeshes) {});
  }

  constructor() { }

  ngOnInit() {
  }

}
