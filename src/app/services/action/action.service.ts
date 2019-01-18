import {Injectable} from '@angular/core';
import {BabylonService} from '../babylon/babylon.service';

import {ActionManager, ExecuteCodeAction} from 'babylonjs';

@Injectable({
  providedIn: 'root'
})
export class ActionService {

  constructor(private babylonService: BabylonService) {
  }

  public createActionManager(mesh: BABYLON.Mesh, trigger: number, actionExecuted: (result: any) => void) {


   // const mesh = this.babylonService.getScene().getMeshesByTags(modelName)[0];

    if (mesh !== null) {

      const scene = this.babylonService.getScene();
      mesh.actionManager = new ActionManager(scene);
      mesh.actionManager.registerAction(new ExecuteCodeAction(
        trigger, function (evt) {
          const pickResult = scene.pick(scene.pointerX, scene.pointerY,
            null, false, scene.activeCamera);
          console.log(pickResult);
          actionExecuted(pickResult);
        }));
    } else {
    }
  }

  public pickableModel(modelName: string, pickable: boolean) {
    this.babylonService.getScene().getMeshesByTags(modelName).map(model => model.isPickable = pickable);
  }

}
