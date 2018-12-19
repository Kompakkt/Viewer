import {Injectable} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {BabylonService} from '../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../action/action.service';
import {AnnotationService} from '../annotation/annotation.service';
import {CameraService} from '../camera/camera.service';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';

@Injectable({
  providedIn: 'root'
})
export class LoadModelService {

  constructor(public babylonService: BabylonService,
              private actionService: ActionService,
              private annotationService: AnnotationService,
              private cameraService: CameraService,
              private loadingScreenHandler: LoadingscreenhandlerService) {
  }

  public loadModel(newModel: Model, quality?: string) {

    if (!this.loadingScreenHandler.isLoading) {

      try {
        this.babylonService.getScene().meshes.map(model => model.dispose());
      } catch (e) {
      }

      const baseUrl = 'https://blacklodge.hki.uni-koeln.de:8065/';

      if (quality === undefined) {
        quality = 'low';
      }

      this.babylonService.loadModel(baseUrl, newModel.processed[quality]).then(async (model) => {

        // Warte auf Antwort von loadModel, da loadModel ein Promise<object> von ImportMeshAync übergibt
        // model ist hier das neu geladene Model, aus dem wir direkt den Namen nehmen können

        // Zentriere auf das neu geladene Model
        this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);

        // Füge Tags hinzu und lade Annotationen
        BABYLON.Tags.AddTagsTo(model.meshes[0], newModel.name);
        this.actionService.pickableModel(newModel.name, true);

        // TODO: Irgendwie auf Initialisierung des annotationServices warten
        setTimeout(() => {
          while (this.loadingScreenHandler.isLoading) {
          }
          this.annotationService.initializeAnnotationMode(newModel.name);
          this.annotationService.loadAnnotations(newModel.name);
        }, 500);
      });
    }
  }
}
