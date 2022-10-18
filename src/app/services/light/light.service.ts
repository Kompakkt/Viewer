import { Injectable } from '@angular/core';
import { DirectionalLight, PointLight, Scene, Vector3, Color3 } from '@babylonjs/core';

import { IEntityLight, IEntitySettings } from 'src/common';
import { BabylonService } from '../babylon/babylon.service';
import { ProcessingService } from '../processing/processing.service';

@Injectable({
  providedIn: 'root',
})
export class LightService {
  private scene: Scene;

  private pointlight: PointLight | undefined;
  private ambientlightUp: DirectionalLight | undefined;
  private ambientlightDown: DirectionalLight | undefined;

  private entitySettings: IEntitySettings | undefined;

  constructor(private babylon: BabylonService, private processing: ProcessingService) {
    this.scene = this.babylon.getScene();
    this.processing.entitySettings$.subscribe(settings => {
      this.entitySettings = settings;
    });
  }

  public initialiseAmbientLight(type: string, intensity: number) {
    if (type !== 'up' && type !== 'down') {
      console.error(this);
      throw new Error('Can not create this light');
    }

    const direction = type === 'up' ? new Vector3(1, -5, 1) : new Vector3(1, 5, 1);

    const light = new DirectionalLight(
      type === 'up' ? 'ambientlightUp' : 'ambientlightDown',
      direction,
      this.scene,
    );
    light.intensity = intensity;
    light.specular = new Color3(0.5, 0.5, 0.5);
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
    this.pointlight.specular = new Color3(0, 0, 0);
    this.pointlight.intensity = intensity;
    this.pointlight.parent = this.babylon.getActiveCamera();
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
      console.error(this);
      throw new Error('No pointlight in scene');
    }
    this.pointlight.position = position;
  }

  public getLightByType(lightType: string): IEntityLight | undefined {
    if (!this.entitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    let light: IEntityLight | undefined;
    if (lightType === 'ambientlightUp' || lightType === 'ambientlightDown') {
      const direction = lightType === 'ambientlightUp' ? 1 : -1;
      light = this.entitySettings.lights.find(
        obj =>
          (obj.type === 'HemisphericLight' || obj.type === 'DirectionalLight') &&
          obj.position.y === direction,
      );
    }
    if (lightType === 'pointLight') {
      light = this.entitySettings.lights.find(obj => obj.type === 'PointLight');
    }
    return light ? light : undefined;
  }

  public getLightIndexByType(lightType: string): number | undefined {
    if (!this.entitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    console.log('get Index of', lightType);
    let indexOfLight;
    if (lightType === 'ambientlightUp' || lightType === 'ambientlightDown') {
      const direction = lightType === 'ambientlightUp' ? 1 : -1;
      console.log('diection:', direction);
      indexOfLight = this.entitySettings.lights.findIndex(
        obj =>
          (obj.type === 'HemisphericLight' || obj.type === 'DirectionalLight') &&
          obj.position.y === direction,
      );
      console.log('index ist', indexOfLight);
    }
    if (lightType === 'pointLight') {
      indexOfLight = this.entitySettings.lights.findIndex(obj => obj.type === 'PointLight');
    }
    return indexOfLight !== undefined ? indexOfLight : undefined;
  }
}
