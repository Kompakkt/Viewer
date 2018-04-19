import {Component, OnInit} from '@angular/core';
import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';


@Component({
  selector: 'app-annotations',
  templateUrl: './annotations.component.html',
  styleUrls: ['./annotations.component.css']
})
export class AnnotationsComponent implements OnInit {

  public createAnnotations() {

    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');

  }

  constructor() {
  }

  ngOnInit() {
  }

}
