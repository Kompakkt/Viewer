import { Injectable } from '@angular/core';
import { DirectionalLight, PointLight, Scene, Vector3, Color3 } from '@babylonjs/core';

import { IEntityLight, IEntitySettings } from 'src/common';
import { BabylonService } from '../babylon/babylon.service';
import { ProcessingService } from '../processing/processing.service';

export type IEntityLightType = 'pointLight' | 'ambientlightUp' | 'ambientlightDown';

const filterLightByType: { [key: string]: (light: IEntityLight) => boolean } = {
  ambientlightUp: light =>
    ['HemisphericLight', 'DirectionalLight'].includes(light.type) && light.position.y === 1,
  ambientlightDown: light =>
    ['HemisphericLight', 'DirectionalLight'].includes(light.type) && light.position.y === -1,
  pointLight: light => light.type === 'PointLight',
};

@Injectable({
  providedIn: 'root',
})
export class LightService {
  private scene: Scene;

  private pointLight: PointLight | undefined;
  private ambientlightUp: DirectionalLight | undefined;
  private ambientlightDown: DirectionalLight | undefined;

  private entitySettings: IEntitySettings | undefined;

  constructor(private babylon: BabylonService, private processing: ProcessingService) {
    this.scene = this.babylon.getScene();
    this.processing.settings$.subscribe(({ localSettings }) => {
      this.entitySettings = localSettings;
    });
  }

  public initialiseAmbientLight(type: 'up' | 'down', intensity: number) {
    const direction = type === 'up' ? new Vector3(1, -5, 1) : new Vector3(1, 5, 1);
    const lightName = type === 'up' ? 'ambientlightUp' : 'ambientlightDown';

    if (this[lightName]) this[lightName]?.dispose();
    const light = new DirectionalLight(lightName, direction, this.scene);
    light.intensity = intensity;
    light.specular = new Color3(0.5, 0.5, 0.5);
    this[lightName] = light;
  }

  public initialisePointLight(intensity: number, position: Vector3) {
    if (this.pointLight) this.pointLight.dispose();
    const pointlight = new PointLight('pointLight', position, this.scene);
    pointlight.specular = new Color3(0, 0, 0);
    pointlight.intensity = intensity;
    pointlight.parent = this.babylon.getActiveCamera();
    this.pointLight = pointlight;
  }

  public setLightIntensity(lightType: IEntityLightType, intensity: number) {
    const light = this[lightType];
    if (light) light.intensity = intensity;
  }

  public setPointLightPosition(position: Vector3) {
    if (!this.pointLight) throw new Error('No pointlight in scene');
    this.pointLight.position = position;
  }

  public getLightByType(lightType: IEntityLightType): IEntityLight | undefined {
    if (!this.entitySettings) throw new Error('Settings missing');
    return this.entitySettings.lights.find(filterLightByType[lightType]);
  }

  public getLightIndexByType(lightType: IEntityLightType): number | undefined {
    if (!this.entitySettings) throw new Error('Settings missing');
    return this.entitySettings.lights.findIndex(filterLightByType[lightType]);
  }
}
