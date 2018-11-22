import {Component, Input, OnInit} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {BabylonService} from '../../services/babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../../services/action/action.service';
import {AnnotationService} from '../../services/annotation/annotation.service';


@Component({
  selector: 'app-model',
  templateUrl: './model.component.html',
  styleUrls: ['./model.component.css']
})
export class ModelComponent implements OnInit {
  @Input() model: Model;

  private actualModelName: string;

  constructor(private babylonService: BabylonService,
              private actionService: ActionService,
              private annotationService: AnnotationService
  ) {
  }

  ngOnInit() {
  }

  public loadModel(): void {
    const mesh = this.babylonService.getScene().getMeshByName(this.actualModelName);

    if (mesh != null) {
      mesh.dispose();
    }


    const dispose = this.babylonService.getScene().getMeshesByTags('actualModel');
    dispose.forEach(function (value) {
      console.log('dispose ' + value);
      value.dispose();
    });


    this.babylonService.loadModel('https://blacklodge.hki.uni-koeln.de:8065/models/', this.model.processed.low);
    const meshes = this.babylonService.getScene().meshes;
    BABYLON.Tags.AddTagsTo(meshes[meshes.length - 1], 'actualModel');
    console.log('NEW');
    console.log('das letzte Model ' + meshes[meshes.length - 1]);
    //console.log('nachher ' + this.babylonService.getScene().meshes);
    this.actionService.pickableModel(meshes[meshes.length - 1].name, true);
    this.annotationService.initializeAnnotationMode(meshes[meshes.length - 1].name);
    this.actualModelName = meshes[meshes.length - 1].name;


    //console.log(this.model.name);
    //console.log(this.model.processed.low.split('.').slice(0, -1).join('.').substring(this.model.processed.low.indexOf('/')+1));
    //this.filename = this.model.name;


  }


}
