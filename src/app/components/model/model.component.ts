import { Component, Input, OnInit } from '@angular/core';
import { Model } from '../../interfaces/model/model.interface';
import { BabylonService } from '../../services/babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import { ActionService } from '../../services/action/action.service';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { CameraService } from '../../services/camera/camera.service';
import { CatalogueService } from '../../services/catalogue/catalogue.service';
import { LoadingscreenhandlerService } from '../../services/loadingscreenhandler/loadingscreenhandler.service';


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
    private cameraService: CameraService,
    private catalogueService: CatalogueService,
    private loadingScreenHandler: LoadingscreenhandlerService
  ) {
  }

  ngOnInit() {
    this.catalogueService.Observables.quality.subscribe((result) => {
      this.catalogueService.updateActiveModel(this.catalogueService.Observables.model.source['_value']);
    });
    this.catalogueService.Observables.model.subscribe(async (result) => this.loadModel(result));
  }

  public async changeModel() {
    this.catalogueService.updateActiveModel(this.model);
  }

  public loadModel(newModel: Model) {
    if (!this.loadingScreenHandler.isLoading) {
      this.babylonService.getScene().meshes.map(model => model.dispose());

      const modelUrl = 'https://blacklodge.hki.uni-koeln.de:8065/models/';
      const quality = this.catalogueService.Observables.quality.source['_value'];

      this.babylonService.loadModel(modelUrl, newModel.processed[quality]).then(async (model) => {
        // Warte auf Antwort von loadModel, da loadModel ein Promise<object> von ImportMeshAync übergibt
        // model ist hier das neu geladene Model, aus dem wir direkt den Namen nehmen können

        // Zentriere auf das neu geladene Model
        this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);

        // Füge Tags hinzu und lade Annotationen
        BABYLON.Tags.AddTagsTo(model.meshes[0], newModel.name);
        this.actionService.pickableModel(newModel.name, true);

        // TODO: Irgendwie auf Initialisierung des annotationServices warten
        setTimeout(() => {
          while (this.loadingScreenHandler.isLoading) { }
          this.annotationService.initializeAnnotationMode(newModel.name);
          this.annotationService.loadAnnotations(newModel.name);
        }, 500);
      });
    }
  }
}
