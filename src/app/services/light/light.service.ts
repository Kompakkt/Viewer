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
import { Subject } from 'rxjs';
import { BabylonService } from '../babylon/babylon.service';
import { ProcessingService } from '../processing/processing.service';
import { LightHelper } from './light-helper';

export type LightType = 'Point' | 'Spot' | 'Ambient' | 'Area' | 'Directional';
export type GizmoKind = 'position' | 'rotation';

export const SPOT_ANGLE_MAX = Math.PI / 2;
export const SPOT_EXPONENT_DEFAULT = 2;
export const SPOT_ANGLE_DEFAULT = Math.PI / 4;

export class LightEntry {
  light: Light;
  proxy: TransformNode;
  type: LightType;
  helper?: LightHelper;
  utilityLayer?: UtilityLayerRenderer;
  positionGizmo?: PositionGizmo;
  rotationGizmo?: RotationGizmo;

  constructor({ light, proxy, type }: { light: Light; proxy: TransformNode; type: LightType }) {
    this.light = light;
    this.proxy = proxy;
    this.type = type;
  }

  get intensity() {
    return this.light.intensity;
  }

  get color(): IColor {
    const { r, g, b } = this.light.diffuse;
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: 255 };
  }

  get name() {
    return this.light.name;
  }

  get position() {
    return this.proxy.position;
  }

  get rotation(): IVector3 {
    const quaternion = this.proxy.rotationQuaternion;
    const euler = quaternion ? quaternion.toEulerAngles() : this.proxy.rotation;
    return {
      x: this.toDegrees(euler.x),
      y: this.toDegrees(euler.y),
      z: this.toDegrees(euler.z),
    };
  }

  private toDegrees(radians: number): number {
    return Math.round(((radians * 180) / Math.PI + 360) % 360);
  }

  get angle(): number {
    if ('angle' in this.light && typeof this.light.angle === 'number') {
      return this.light.angle;
    }
    return SPOT_ANGLE_DEFAULT;
  }

  get exponent(): number {
    if ('exponent' in this.light && typeof this.light.exponent === 'number') {
      return this.light.exponent;
    }
    return SPOT_EXPONENT_DEFAULT;
  }

  get width(): number {
    if ('width' in this.light && typeof this.light.width === 'number') {
      return this.light.width;
    }
    return 1;
  }

  get height(): number {
    if ('height' in this.light && typeof this.light.height === 'number') {
      return this.light.height;
    }
    return 1;
  }
}

const WHITE: IColor = { r: 255, g: 255, b: 255, a: 255 };

@Injectable({ providedIn: 'root' })
export class LightService {
  private babylon = inject(BabylonService);
  private processing = inject(ProcessingService);
  readonly entries: Map<number, LightEntry> = new Map();
  readonly lightPicked = new Subject<number>();
  private helpersVisible = false;

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
    if (entry) {
      entry.light.diffuse = this.toColor3(value);
      entry.helper?.setColor(value);
    }
  }

  public setPosition(index: number, value: IVector3): void {
    this.updateConfig(index, { position: value });
    const entry = this.entries.get(index);
    if (entry) entry.proxy.position = this.toVector3(value);
  }

  public setRotation(index: number, value: IVector3): void {
    this.updateConfig(index, { rotation: value });
    const entry = this.entries.get(index);
    if (entry) {
      entry.proxy.rotationQuaternion = this.toQuaternion(value);
      this.syncAmbientDirection(entry);
    }
  }

  public setSpotParams(index: number, angle: number, exponent: number): void {
    this.updateConfig(index, { angle, exponent });
    const entry = this.entries.get(index);
    if (entry && entry.light instanceof SpotLight) {
      entry.light.angle = angle;
      entry.light.exponent = exponent;
      entry.helper?.rebuild({ angle });
    }
  }

  public setAreaSize(index: number, width: number, height: number): void {
    this.updateConfig(index, { width, height });
    const entry = this.entries.get(index);
    if (entry && entry.light instanceof RectAreaLight) {
      entry.light.width = width;
      entry.light.height = height;
      entry.helper?.rebuild({ width, height });
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

  public setHelpersVisible(visible: boolean): void {
    this.helpersVisible = visible;
    for (const entry of this.entries.values()) {
      entry.helper?.setVisible(visible);
    }
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

    const entry = new LightEntry({ light, proxy, type: config.type });
    entry.helper = new LightHelper({
      scene: this.babylon.scene,
      name: name,
      type: config.type,
      color: config.color ?? WHITE,
      size: this.modelSize(),
      angle: entry.angle,
      width: entry.width,
      height: entry.height,
      onPick: () => this.lightPicked.next(index),
    });
    entry.helper.root.parent = proxy;
    entry.helper.setVisible(this.helpersVisible);
    this.syncAmbientDirection(entry);

    this.entries.set(index, entry);
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
    gizmo.onDragObservable.add(() => this.syncAmbientDirection(entry));
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
    this.syncAmbientDirection(entry);
  }

  /**
   * HemisphericLight.direction is not transformed by its parent, so rotating the
   * proxy has no effect on an Ambient light. Drive the direction vector manually
   * from the proxy rotation instead.
   */
  private syncAmbientDirection(entry: LightEntry): void {
    if (!(entry.light instanceof HemisphericLight)) return;
    entry.proxy.computeWorldMatrix(true);
    const direction = Vector3.Zero();
    Vector3.TransformNormalToRef(Vector3.Forward(), entry.proxy.getWorldMatrix(), direction);
    entry.light.direction.copyFrom(direction);
  }

  private disposeLight(index: number): void {
    const entry = this.entries.get(index);
    if (!entry) return;

    entry.positionGizmo?.dispose();
    entry.rotationGizmo?.dispose();
    entry.utilityLayer?.dispose();
    entry.helper?.dispose();
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

  private modelSize(): number {
    // Mirrors EntitySettingsService.calculateMinMax so the size survives mesh
    // settings finalization (which bakes scale into the meshes and disposes 'center').
    const meshes = this.processing.meshes();
    let min: Vector3 | undefined;
    let max: Vector3 | undefined;
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const boundingInfo = mesh.getBoundingInfo();
      if (boundingInfo.diagonalLength === 0) continue;
      const { minimumWorld, maximumWorld } = boundingInfo.boundingBox;
      min = min ? Vector3.Minimize(min, minimumWorld) : minimumWorld.clone();
      max = max ? Vector3.Maximize(max, maximumWorld) : maximumWorld.clone();
    }
    if (!min || !max) return 1;

    const dimensions = max.subtract(min);
    const size = Math.max(dimensions.x, dimensions.y, dimensions.z);
    return Number.isFinite(size) && size > 0 ? size : 1;
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
