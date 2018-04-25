/**
 * @author Benedikt Mildenberger
 */

import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

@Injectable()
export class ImportService {

  constructor() {
  }

  public loadObj(scene: BABYLON.Scene, rootUrl: string, filename: string) {

    return new Promise <any> ((resolve, reject) => {
      BABYLON.SceneLoader.Append(rootUrl, filename, scene, function (success) {
        resolve(success);
      });
    });
  }
}
