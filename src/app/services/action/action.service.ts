import {Injectable} from '@angular/core';
import {ActionManager, ExecuteCodeAction, Mesh as IMesh} from 'babylonjs';

import {BabylonService} from '../babylon/babylon.service';

@Injectable({
  providedIn: 'root',
})
export class ActionService {

  constructor(private babylonService: BabylonService) {
  }

  public createActionManager(mesh: IMesh | null, trigger: number, actionExecuted: (result: any) => void) {
    if (!mesh) return;

    const scene = this.babylonService.getScene();
    mesh.actionManager = new ActionManager(scene);
    mesh.actionManager.registerAction(new ExecuteCodeAction(
      trigger, () => {
        const pickResult = scene
          .pick(scene.pointerX, scene.pointerY, undefined, false, scene.activeCamera);
        console.log(pickResult);
        actionExecuted(pickResult);
      }));
  }

  public pickableModel(mesh: IMesh, pickable: boolean) {
    mesh.isPickable = pickable;
  }

}
