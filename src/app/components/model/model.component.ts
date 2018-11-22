import {Component, Input, OnInit} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {BabylonService} from '../../services/babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../../services/action/action.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {CameraService} from '../../services/camera/camera.service';


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
              private annotationService: AnnotationService,
              private cameraService: CameraService
  ) {
  }

  ngOnInit() {
  }

  public loadModel(): void {
    this.babylonService.getScene().meshes.map(model => model.dispose());

    this.babylonService.loadModel('https://blacklodge.hki.uni-koeln.de:8065/models/', this.model.processed.low)
    .then(model => {
      // Warte auf Antwort von loadModel, da loadModel ein Promise<object> von ImportMeshAync übergibt
      // model ist hier das neu geladene Model, aus dem wir direkt den Namen nehmen können

      // Zentriere auf das neu geladene Model
      this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);

      // Füge Tags hinzu und lade Annotationen
      BABYLON.Tags.AddTagsTo(model, model.meshes[0].name);
      this.actionService.pickableModel(model.meshes[0].name, true);
      this.annotationService.initializeAnnotationMode(model.meshes[0].name);
      this.actualModelName = model.meshes[0].name;
      this.annotationService.loadAnnotations(this.actualModelName);

    });


  }


}
