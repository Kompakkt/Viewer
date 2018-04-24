import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-upload-model',
  templateUrl: './upload-model.component.html',
  styleUrls: ['./upload-model.component.css']
})
export class UploadModelComponent implements OnInit {

  public loadObject(scene: BABYLON.Scene) {
    BABYLON.SceneLoader.ImportMesh('', 'assets/models/testmodel/',
      'testmodel.obj', scene, function (newMeshes) {
      });
  }

  constructor() {
  }

  ngOnInit() {
  }

}
