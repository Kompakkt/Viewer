import { inject, Injectable, signal } from '@angular/core';
import {
  Color3,
  DirectionalLight,
  HemisphericLight,
  Light,
  PointLight,
  PositionGizmo,
  Quaternion,
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

export type LightType = 'Point' | 'Spot' | 'Ambient' | 'Directional';
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

  get hasPositionGizmo(): boolean {
    return this.type === 'Point' || this.type === 'Spot';
  }

  get hasRotationGizmo(): boolean {
    return this.type === 'Spot' || this.type === 'Ambient' || this.type === 'Directional';
  }

  get hasSpotParams(): boolean {
    return this.type === 'Spot';
  }
}

const WHITE: IColor = { r: 255, g: 255, b: 255, a: 255 };

@Injectable({ providedIn: 'root' })
export class LightService {
  private babylon = inject(BabylonService);
  private processing = inject(ProcessingService);
  readonly entries: Map<number, LightEntry> = new Map();
  readonly lightPicked = new Subject<number>();
  readonly selectedLightIndex = signal<number | undefined>(undefined);
  // Global show/hide preferences: helper visuals default to on, gizmos stay
  // opt-in, and the light panel's own activation gates everything.
  readonly helpersOn = signal(true);
  readonly positionGizmosOn = signal(false);
  readonly rotationGizmosOn = signal(false);
  private panelActive = false;

  public selectLight(index: number): void {
    if (!this.entries.has(index)) return;
    this.selectedLightIndex.set(index);
    this.applySelection();
  }

  public clearSelection(): void {
    if (this.selectedLightIndex() === undefined) return;
    this.selectedLightIndex.set(undefined);
    this.applySelection();
  }

  private applySelection(): void {
    const selected = this.selectedLightIndex();
    for (const [index, entry] of this.entries) {
      const isSelected = index === selected;
      entry.helper?.setSelected(isSelected);
      this.applyGizmos(index, entry, isSelected);
    }
  }

  private applyGizmos(index: number, entry: LightEntry, isSelected: boolean): void {
    // The global gizmo toggles materialize only on the selected light and only
    // for supported kinds. An unsupported light ignores the setting, but the
    // toggle state is kept, so it re-applies when a matching light is selected.
    if (isSelected && this.positionGizmosOn() && entry.hasPositionGizmo) {
      if (!entry.positionGizmo) entry.positionGizmo = this.createPositionGizmo(entry, index);
      entry.positionGizmo.attachedNode = entry.proxy;
    } else if (entry.positionGizmo) {
      // A gizmo left attached to a previously selected light keeps floating in
      // the scene; detaching hides it without throwing away the gizmo object.
      entry.positionGizmo.attachedNode = null;
    }
    if (isSelected && this.rotationGizmosOn() && entry.hasRotationGizmo) {
      if (!entry.rotationGizmo) entry.rotationGizmo = this.createRotationGizmo(entry, index);
      entry.rotationGizmo.attachedNode = entry.proxy;
    } else if (entry.rotationGizmo) {
      entry.rotationGizmo.attachedNode = null;
    }
  }

  public initialiseLights(): void {
    const settings = this.processing.settings().localSettings;
    console.log('[LightService] initialiseLights', settings.lights.length, 'lights');
    this.clearSelection();
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
    this.selectLight(index);
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

    const selected = this.selectedLightIndex();
    if (selected === index) {
      this.clearSelection();
    } else if (selected !== undefined && selected > index) {
      this.selectedLightIndex.set(selected - 1);
      this.applySelection();
    }
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

  public setName(index: number, value: string): void {
    this.updateConfig(index, { name: value });
    // The light list shows light.name; keep it consistent with the value the
    // entries will get after a rebuild (trim + index fallback).
    const settings = this.processing.settings().localSettings;
    const entry = this.entries.get(index);
    if (entry && settings.lights[index]) {
      entry.light.name = this.lightName(settings.lights[index], index);
    }
  }

  public setPanelActive(active: boolean): void {
    this.panelActive = active;
    this.applyHelperState();
    if (!active) this.clearSelection();
  }

  public setHelpersVisible(visible: boolean): void {
    this.helpersOn.set(visible);
    this.applyHelperState();
  }

  public setGizmoEnabled(kind: GizmoKind, enabled: boolean): void {
    (kind === 'position' ? this.positionGizmosOn : this.rotationGizmosOn).set(enabled);
    const selected = this.selectedLightIndex();
    if (selected === undefined) return;
    const entry = this.entries.get(selected);
    if (!entry) return;
    this.applyGizmos(selected, entry, true);
  }

  public disposeAllLights(): void {
    for (const [index] of this.entries) {
      this.disposeLight(index);
    }
    this.entries.clear();
  }

  private applyHelperState(): void {
    for (const entry of this.entries.values()) {
      // Helper meshes (arrows, cones, outlines) follow both the panel activation
      // and the global toggle; the LightGizmo sphere only follows the panel so
      // lights stay pickable in the scene while the panel is open.
      entry.helper?.setVisualsVisible(this.panelActive && this.helpersOn());
      entry.helper?.setLightGizmoVisible(this.panelActive);
    }
  }

  private createLight(index: number, config: IEntityLight): void {
    if (this.entries.has(index)) return;

    // 'Area' lights were retired with RectAreaLight; ignore legacy saved entries
    // instead of throwing, so old entity settings keep loading.
    if (config.type === 'Area') return;

    const proxy = new TransformNode(`lightProxy_${index}`, this.babylon.scene);
    // Ambient light has no meaningful position of its own; anchor it just above
    // the model so rotation gizmo and helper sit in a sensible spot.
    proxy.position =
      config.type === 'Ambient' ? this.defaultLightAnchor() : this.toVector3(config.position);
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
      case 'Directional': {
        const directional = new DirectionalLight(name, Vector3.Forward(), this.babylon.scene);
        // DirectionalLight's constructor seeds position with -direction; zero
        // it so the shadow frustum origin sits on the proxy, not behind it.
        directional.position = Vector3.Zero();
        light = directional;
        break;
      }
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
      light,
      type: config.type,
      color: config.color ?? WHITE,
      size: this.modelSize(),
      angle: entry.angle,
      onPick: () => {
        this.lightPicked.next(index);
        this.selectLight(index);
      },
    });
    entry.helper.root.parent = proxy;
    entry.helper.setVisualsVisible(this.panelActive && this.helpersOn());
    entry.helper.setLightGizmoVisible(this.panelActive);
    this.syncAmbientDirection(entry);

    this.entries.set(index, entry);
  }

  private createPositionGizmo(entry: LightEntry, index: number): PositionGizmo {
    if (!entry.utilityLayer) {
      entry.utilityLayer = new UtilityLayerRenderer(this.babylon.scene);
    }
    const gizmo = new PositionGizmo(entry.utilityLayer, 2);
    gizmo.attachedNode = entry.proxy;
    gizmo.onDragEndObservable.add(() => this.writeBackPosition(index));
    entry.positionGizmo = gizmo;
    return gizmo;
  }

  private createRotationGizmo(entry: LightEntry, index: number): RotationGizmo {
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
    return gizmo;
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
    this.applySelection();
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
      position: this.toIVector3(this.defaultLightAnchor()),
      intensity: 1,
      color: { ...WHITE },
      name: this.defaultNameForType(type, settings.lights.length),
    };

    switch (type) {
      case 'Spot':
        return { ...base, rotation: { x: 0, y: 0, z: 0 }, angle: Math.PI / 4, exponent: 2 };
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

  private modelBounds(): { min: Vector3; max: Vector3 } | undefined {
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
    if (!min || !max) return undefined;
    return { min, max };
  }

  private modelSize(): number {
    const bounds = this.modelBounds();
    if (!bounds) return 1;

    const dimensions = bounds.max.subtract(bounds.min);
    const size = Math.max(dimensions.x, dimensions.y, dimensions.z);
    return Number.isFinite(size) && size > 0 ? size : 1;
  }

  private defaultLightAnchor(): Vector3 {
    const bounds = this.modelBounds();
    if (!bounds) return new Vector3(0, 1, 0);
    const { min, max } = bounds;
    const height = max.y - min.y;
    return new Vector3((min.x + max.x) / 2, max.y + height / 2, (min.z + max.z) / 2);
  }

  private toVector3(v: IVector3): Vector3 {
    return new Vector3(v.x, v.y, v.z);
  }

  private toIVector3(v: Vector3): IVector3 {
    return { x: v.x, y: v.y, z: v.z };
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
