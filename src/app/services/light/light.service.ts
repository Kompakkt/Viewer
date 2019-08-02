import { Injectable } from '@angular/core';
import { HemisphericLight, PointLight, Scene, Vector3 } from 'babylonjs';
import { BabylonService } from '../babylon/babylon.service';

@Injectable({
  providedIn: 'root',
})
export class LightService {
  private scene: Scene;

  private pointlight: PointLight | undefined;
  private ambientlightUp: HemisphericLight | undefined;
  private ambientlightDown: HemisphericLight | undefined;

  private pointlightPosX: number | undefined;
  private pointlightPosY: number | undefined;
  private pointlightPosZ: number | undefined;
  public pointlightIntensity: number | undefined;

  constructor(private babylonService: BabylonService) {
    this.scene = this.babylonService.getScene();
  }

  public setLightIntensity(light: string, intensity: number) {
    if (light === 'pointlight' && this.pointlight) {
      this.pointlight.intensity = intensity;
      this.pointlightIntensity = intensity;
    }
    if (light === 'ambientlightUp' && this.ambientlightUp) {
      this.ambientlightUp.intensity = intensity;
    }
    if (light === 'ambientlightDown' && this.ambientlightDown) {
      this.ambientlightDown.intensity = intensity;
    }
  }

  public createPointLight(name: string, position: any) {
    if (this.pointlight) this.pointlight.dispose();
    this.pointlight = new PointLight(
      name,
      new Vector3(position.x, position.y, position.z),
      this.scene,
    );
    this.pointlightPosX = position.x;
    this.pointlightPosY = position.y;
    this.pointlightPosZ = position.z;

    this.pointlight.intensity = this.pointlightIntensity
      ? this.pointlightIntensity
      : 1.0;

    this.pointlight.specular = new BABYLON.Color3(0, 0, 0);

    // return this.pointlight;
  }

  public createAmbientlightDown(name: string, position: any) {
    if (this.ambientlightDown) this.ambientlightDown.dispose();
    this.ambientlightDown = new HemisphericLight(
      name,
      new Vector3(position.x, position.y, position.z),
      this.scene,
    );
    this.ambientlightDown.specular = new BABYLON.Color3(0, 0, 0);
  }

  public createAmbientlightUp(name: string, position: any) {
    if (this.ambientlightUp) this.ambientlightUp.dispose();
    this.ambientlightUp = new HemisphericLight(
      name,
      new Vector3(position.x, position.y, position.z),
      this.scene,
    );
    this.ambientlightUp.specular = new BABYLON.Color3(0, 0, 0);
  }

  public setLightPosition(dimension: string, pos: number) {
    switch (dimension) {
      case 'x':
        this.pointlightPosX = pos;
        break;
      case 'y':
        this.pointlightPosY = pos;
        break;
      case 'z':
        this.pointlightPosZ = pos;
        break;
      default:
    }

    this.createPointLight('pointlight', {
      x: this.pointlightPosX,
      y: this.pointlightPosY,
      z: this.pointlightPosZ,
    });
  }

  public getPointlightData(): any {
    return {
      type: 'PointLight',
      position: {
        x: this.pointlightPosX,
        y: this.pointlightPosY,
        z: this.pointlightPosZ,
      },
      intensity: this.pointlightIntensity ? this.pointlightIntensity : 1,
    };
  }
}
