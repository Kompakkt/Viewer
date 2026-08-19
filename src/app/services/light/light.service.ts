import { inject, Injectable } from '@angular/core';
import {
  Color3,
  DirectionalLight,
  HemisphericLight,
  Light,
  PointLight,
  PositionGizmo,
  Quaternion,
  RectAreaLight,
  RotationGizmo,
  SpotLight,
  TransformNode,
  UtilityLayerRenderer,
  Vector3,
} from '@babylonjs/core';

import { IColor, IEntityLight, IEntitySettings, IVector3 } from '@kompakkt/common';
import { BabylonService } from '../babylon/babylon.service';
import { ProcessingService } from '../processing/processing.service';

export type LightType = 'Point' | 'Spot' | 'Ambient' | 'Area' | 'Directional';
export type GizmoKind = 'position' | 'rotation';

interface LightEntry {
  light: Light;
  proxy: TransformNode;
  utilityLayer?: UtilityLayerRenderer;
  positionGizmo?: PositionGizmo;
  rotationGizmo?: RotationGizmo;
}

const WHITE: IColor = { r: 255, g: 255, b: 255, a: 255 };

@Injectable({ providedIn: 'root' })
export class LightService {
  private babylon = inject(BabylonService);
  private processing = inject(ProcessingService);
  private entries: Map<number, LightEntry> = new Map();

  public initialiseLights(): void {
    const settings = this.processing.settings().localSettings;
    console.log('[LightService] initialiseLights', settings.lights.length, 'lights');
    this.disposeAllLights();

    for (let index = 0; index < settings.lights.length; index++) {
      this.createLight(index, settings.lights[index]);
    }
    console.log('[LightService] entries after init', this.entries.size);
  }

  public addLight(type: LightType): number {
    const settings = this.processing.settings().localSettings;
    const newLight = this.createDefaultLight(type);
    const index = settings.lights.length;
    settings.lights.push(newLight);
    this.createLight(index, newLight);
    this.processing.localSettings.set(settings);
    return index;
  }

  public removeLight(index: number): void {
    const settings = this.processing.settings().localSettings;
    if (index < 0 || index >= settings.lights.length) {
      throw new Error(`Invalid light index: ${index}`);
    }
    this.disposeLight(index);
    settings.lights.splice(index, 1);
    this.processing.localSettings.set(settings);
    this.rebuildEntriesFromSettings(settings);
  }

  public setIntensity(index: number, value: number): void {
    this.updateConfig(index, { intensity: value });
    const entry = this.entries.get(index);
    if (entry) entry.light.intensity = value;
  }

  public setColor(index: number, value: IColor): void {
    this.updateConfig(index, { color: value });
    const entry = this.entries.get(index);
    if (entry) entry.light.diffuse = this.toColor3(value);
  }

  public setPosition(index: number, value: IVector3): void {
    this.updateConfig(index, { position: value });
    const entry = this.entries.get(index);
    if (entry) entry.proxy.position = this.toVector3(value);
  }

  public setRotation(index: number, value: IVector3): void {
    this.updateConfig(index, { rotation: value });
    const entry = this.entries.get(index);
    if (entry) entry.proxy.rotationQuaternion = this.toQuaternion(value);
  }

  public setSpotParams(index: number, angle: number, exponent: number): void {
    this.updateConfig(index, { angle, exponent });
    const entry = this.entries.get(index);
    if (entry && entry.light instanceof SpotLight) {
      entry.light.angle = angle;
      entry.light.exponent = exponent;
    }
  }

  public setAreaSize(index: number, width: number, height: number): void {
    this.updateConfig(index, { width, height });
    const entry = this.entries.get(index);
    if (entry && entry.light instanceof RectAreaLight) {
      entry.light.width = width;
      entry.light.height = height;
    }
  }

  public setName(index: number, value: string): void {
    this.updateConfig(index, { name: value });
  }

  public setGizmoEnabled(index: number, kind: GizmoKind, enabled: boolean): void {
    const entry = this.entries.get(index);
    console.log('[LightService] setGizmoEnabled', {
      index,
      kind,
      enabled,
      hasEntry: !!entry,
      entryCount: this.entries.size,
      entry,
    });
    if (!entry) return;

    if (kind === 'position') {
      if (enabled) {
        if (!entry.positionGizmo) {
          this.createPositionGizmo(entry, index);
        }
        entry.positionGizmo!.attachedNode = entry.proxy;
      } else {
        entry.positionGizmo!.attachedNode = null;
      }
    } else {
      if (enabled) {
        if (!entry.rotationGizmo) {
          this.createRotationGizmo(entry, index);
        }
        entry.rotationGizmo!.attachedNode = entry.proxy;
      } else {
        entry.rotationGizmo!.attachedNode = null;
      }
    }
  }

  public disposeAllLights(): void {
    for (const [index] of this.entries) {
      this.disposeLight(index);
    }
    this.entries.clear();
  }

  private createLight(index: number, config: IEntityLight): void {
    if (this.entries.has(index)) return;

    const proxy = new TransformNode(`lightProxy_${index}`, this.babylon.scene);
    proxy.position = this.toVector3(config.position);
    if (config.rotation) {
      proxy.rotationQuaternion = this.toQuaternion(config.rotation);
    }

    let light: Light;
    const color = this.toColor3(config.color ?? WHITE);
    const name = this.lightName(config, index);

    switch (config.type) {
      case 'Point':
        light = new PointLight(name, Vector3.Zero(), this.babylon.scene);
        break;
      case 'Spot': {
        light = new SpotLight(
          name,
          Vector3.Zero(),
          Vector3.Forward(),
          config.angle ?? Math.PI / 4,
          config.exponent ?? 2,
          this.babylon.scene,
        );
        break;
      }
      case 'Ambient':
        light = new HemisphericLight(name, Vector3.Forward(), this.babylon.scene);
        break;
      case 'Area':
        light = new RectAreaLight(
          name,
          Vector3.Zero(),
          config.width ?? 1,
          config.height ?? 1,
          this.babylon.scene,
        );
        break;
      case 'Directional':
        light = new DirectionalLight(name, Vector3.Forward(), this.babylon.scene);
        break;
      default:
        throw new Error(`Unsupported light type: ${config.type}`);
    }

    light.parent = proxy;
    light.intensity = config.intensity;
    light.diffuse = color;

    this.entries.set(index, { light, proxy });
  }

  private createPositionGizmo(entry: LightEntry, index: number): void {
    if (!entry.utilityLayer) {
      entry.utilityLayer = new UtilityLayerRenderer(this.babylon.scene);
    }
    const gizmo = new PositionGizmo(entry.utilityLayer, 2);
    gizmo.attachedNode = entry.proxy;
    gizmo.onDragEndObservable.add(() => this.writeBackPosition(index));
    entry.positionGizmo = gizmo;
  }

  private createRotationGizmo(entry: LightEntry, index: number): void {
    if (!entry.utilityLayer) {
      entry.utilityLayer = new UtilityLayerRenderer(this.babylon.scene);
    }
    const gizmo = new RotationGizmo(entry.utilityLayer, undefined, undefined, 2);
    gizmo.updateGizmoRotationToMatchAttachedMesh = true;
    gizmo.updateGizmoPositionToMatchAttachedMesh = true;
    gizmo.attachedNode = entry.proxy;
    gizmo.onDragEndObservable.add(() => this.writeBackRotation(index));
    entry.rotationGizmo = gizmo;
  }

  private writeBackPosition(index: number): void {
    const entry = this.entries.get(index);
    if (!entry) return;
    const position = entry.proxy.position;
    const settings = this.processing.settings().localSettings;
    settings.lights[index].position = { x: position.x, y: position.y, z: position.z };
    this.processing.localSettings.set(settings);
  }

  private writeBackRotation(index: number): void {
    const entry = this.entries.get(index);
    if (!entry) return;
    const rotation = entry.proxy.rotationQuaternion?.toEulerAngles() ?? entry.proxy.rotation;
    const settings = this.processing.settings().localSettings;
    settings.lights[index].rotation = {
      x: this.radiansToDegrees(rotation.x),
      y: this.radiansToDegrees(rotation.y),
      z: this.radiansToDegrees(rotation.z),
    };
    this.processing.localSettings.set(settings);
  }

  private disposeLight(index: number): void {
    const entry = this.entries.get(index);
    if (!entry) return;

    entry.positionGizmo?.dispose();
    entry.rotationGizmo?.dispose();
    entry.utilityLayer?.dispose();
    entry.light.dispose();
    entry.proxy.dispose();

    this.entries.delete(index);
  }

  private rebuildEntriesFromSettings(settings: IEntitySettings): void {
    this.disposeAllLights();
    for (let index = 0; index < settings.lights.length; index++) {
      this.createLight(index, settings.lights[index]);
    }
  }

  private updateConfig(index: number, changes: Partial<IEntityLight>): void {
    const settings = this.processing.settings().localSettings;
    if (index < 0 || index >= settings.lights.length) {
      throw new Error(`Invalid light index: ${index}`);
    }
    const updatedLight = { ...settings.lights[index], ...changes };
    settings.lights[index] = updatedLight;
    this.processing.localSettings.set(settings);
  }

  private createDefaultLight(type: LightType): IEntityLight {
    const settings = this.processing.settings().localSettings;
    const base: IEntityLight = {
      type,
      position: { x: 0, y: type === 'Ambient' || type === 'Directional' ? 1 : 0, z: 0 },
      intensity: 1,
      color: { ...WHITE },
      name: this.defaultNameForType(type, settings.lights.length),
    };

    switch (type) {
      case 'Spot':
        return { ...base, rotation: { x: 0, y: 0, z: 0 }, angle: Math.PI / 4, exponent: 2 };
      case 'Area':
        return { ...base, rotation: { x: 0, y: 0, z: 0 }, width: 1, height: 1 };
      case 'Directional':
      case 'Ambient':
        return { ...base, rotation: { x: 0, y: 0, z: 0 } };
      default:
        return base;
    }
  }

  private defaultNameForType(type: LightType, existingCount: number): string {
    const label = `${type} Light`;
    return existingCount > 0 ? `${label} ${existingCount + 1}` : label;
  }

  private lightName(config: IEntityLight, index: number): string {
    return config.name?.trim() || `light_${index}`;
  }

  private toVector3(v: IVector3): Vector3 {
    return new Vector3(v.x, v.y, v.z);
  }

  private toQuaternion(rotation: IVector3): Quaternion {
    return Quaternion.FromEulerAngles(
      (rotation.x * Math.PI) / 180,
      (rotation.y * Math.PI) / 180,
      (rotation.z * Math.PI) / 180,
    );
  }

  private radiansToDegrees(rad: number): number {
    return Math.round(((rad * 180) / Math.PI + 360) % 360);
  }

  private toColor3(color: IColor): Color3 {
    return new Color3(color.r / 255, color.g / 255, color.b / 255);
  }
}
