import { Injectable } from '@angular/core';
import { HemisphericLight, PointLight, Scene, Vector3 } from 'babylonjs';

import { IEntityLight } from '../../interfaces/interfaces';
import { BabylonService } from '../babylon/babylon.service';
import { ProcessingService } from '../processing/processing.service';

@Injectable({
  providedIn: 'root',
})
export class LightService {
  private scene: Scene;

  private pointlight: PointLight | undefined;
  private ambientlightUp: HemisphericLight | undefined;
  private ambientlightDown: HemisphericLight | undefined;

  constructor(
    private babylonService: BabylonService,
    private processingService: ProcessingService,
  ) {
    this.scene = this.babylonService.getScene();
  }

  public initialiseAmbientLight(type: string, intensity: number) {
    if (type !== 'up' && type !== 'down') {
      throw new Error('Can not create this light');
      console.error(this);
      return;
    }
    const position = new Vector3(0, type === 'up' ? 1 : -1, 0);
    const light = new HemisphericLight(
      type === 'up' ? 'ambientlightUp' : 'ambientlightDown',
      position,
      this.scene,
    );
    light.intensity = intensity;
    light.specular = new BABYLON.Color3(0, 0, 0);
    if (type === 'up') {
      if (this.ambientlightUp) this.ambientlightUp.dispose();
      this.ambientlightUp = light;
    } else {
      if (this.ambientlightDown) this.ambientlightDown.dispose();
      this.ambientlightDown = light;
    }
  }

  public initialisePointLight(intensity: number, position: Vector3) {
    if (this.pointlight) this.pointlight.dispose();
    this.pointlight = new PointLight('pointLight', position, this.scene);
    this.pointlight.specular = new BABYLON.Color3(0, 0, 0);
    this.pointlight.intensity = intensity;
    this.pointlight.parent = this.babylonService.getActiveCamera();
  }

  public setLightIntensity(light: string, intensity: number) {
    if (light === 'pointLight' && this.pointlight) {
      this.pointlight.intensity = intensity;
    }
    if (light === 'ambientlightUp' && this.ambientlightUp) {
      this.ambientlightUp.intensity = intensity;
    }
    if (light === 'ambientlightDown' && this.ambientlightDown) {
      this.ambientlightDown.intensity = intensity;
    }
  }

  public setPointLightPosition(position: Vector3) {
    if (!this.pointlight) {
      throw new Error('No pointlight in scene');
      console.error(this);
      return;
    }
    this.pointlight.position = position;
  }

  public getLightByType(lightType: string): IEntityLight | undefined {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return undefined;
    }
    let light;
    if (lightType === 'ambientlightUp' || lightType === 'ambientlightDown') {
      let direction;
      if (lightType === 'ambientlightUp') direction = 1;
      if (lightType === 'ambientlightDown') direction = -1;
      light = this.processingService.actualEntitySettings.lights.find(
        obj => obj.type === 'HemisphericLight' && obj.position.y === direction,
      );
    }
    if (lightType === 'pointLight') {
      light = this.processingService.actualEntitySettings.lights.find(
        obj => obj.type === 'PointLight',
      );
    }
    return light ? light : undefined;
  }

  public getLightIndexByType(lightType: string): number | undefined {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    console.log('get Index of', lightType);
    let indexOfLight;
    if (lightType === 'ambientlightUp' || lightType === 'ambientlightDown') {
      let direction;
      if (lightType === 'ambientlightUp') direction = 1;
      if (lightType === 'ambientlightDown') direction = -1;
      console.log('diection:', direction);
      indexOfLight = this.processingService.actualEntitySettings.lights.findIndex(
        obj => obj.type === 'HemisphericLight' && obj.position.y === direction,
      );
      console.log('index ist', indexOfLight);
    }
    if (lightType === 'pointLight') {
      indexOfLight = this.processingService.actualEntitySettings.lights.findIndex(
        obj => obj.type === 'PointLight',
      );
    }
    return indexOfLight !== undefined ? indexOfLight : undefined;
  }
}
