import {
  ActionManager,
  Color3,
  DirectionalLight,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  SpotLight,
  StandardMaterial,
  Tags,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { LightGizmo } from '@babylonjs/core/Gizmos/lightGizmo';
import { UtilityLayerRenderer } from '@babylonjs/core/Rendering/utilityLayerRenderer';
import type { Light } from '@babylonjs/core/Lights/light';
import type { Observer } from '@babylonjs/core/Misc/observable';
import type { IColor } from '@kompakkt/common';
import { SPOT_EXPONENT_DEFAULT } from './light.service';
import type { LightType } from './light.service';

export const LIGHT_HELPER_TAG = 'lightHelper';
// Group 3 is unused by the rest of the scene; clearing its depth buffer keeps
// light helpers visible even when they sit inside the model.
const LIGHT_HELPER_RENDERING_GROUP = 3;
const SELECTED_COLOR_FALLBACK = '#00afe7';
let selectedColor: Color3 | undefined;

function getSelectedColor(): Color3 {
  if (!selectedColor) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary')
      .trim();
    selectedColor = Color3.FromHexString(raw || SELECTED_COLOR_FALLBACK);
  }
  return selectedColor;
}

interface SharedUtilityLayer {
  renderer: UtilityLayerRenderer;
  refCount: number;
}

// One utility layer per scene, shared by all light helper gizmos.
const sharedUtilityLayers = new Map<Scene, SharedUtilityLayer>();

function acquireUtilityLayer(scene: Scene): UtilityLayerRenderer {
  let shared = sharedUtilityLayers.get(scene);
  if (!shared) {
    shared = { renderer: new UtilityLayerRenderer(scene), refCount: 0 };
    sharedUtilityLayers.set(scene, shared);
  }
  shared.refCount++;
  return shared.renderer;
}

function releaseUtilityLayer(scene: Scene): void {
  const shared = sharedUtilityLayers.get(scene);
  if (!shared) return;
  shared.refCount--;
  if (shared.refCount <= 0) {
    shared.renderer.dispose();
    sharedUtilityLayers.delete(scene);
  }
}

export interface LightHelperOptions {
  scene: Scene;
  name: string;
  light: Light;
  type: LightType;
  color: IColor;
  size: number;
  angle: number;
  onPick?: () => void;
}

export class LightHelper {
  public readonly root: TransformNode;
  private readonly scene: Scene;
  private readonly material: StandardMaterial;
  private meshes: Mesh[] = [];
  private outlineMeshes: Mesh[] = [];
  private outlineMaterial?: StandardMaterial;
  private options: LightHelperOptions;
  private selected = false;
  private lightGizmo?: LightGizmo;
  private gizmoAnchorLight?: Light;
  private lightDisposeObserver?: Observer<Light>;

  // Inverted-hull outline: clones scaled up slightly so they peek out around
  // the original meshes as a hard-edged stroke.
  private static readonly OUTLINE_SCALE = 1.08;

  // The spot cone is drawn translucent so the surface lit by the spot stays
  // visible through it, and it gets no outline.
  private static readonly SPOT_CONE_VISIBILITY = 0.1;

  constructor(options: LightHelperOptions) {
    this.options = options;
    this.scene = options.scene;
    this.root = new TransformNode(`${options.name}_helper`, options.scene);
    Tags.AddTagsTo(this.root, LIGHT_HELPER_TAG);
    this.material = new StandardMaterial(`${options.name}_helperMat`, options.scene);
    this.material.disableLighting = true;
    this.material.emissiveColor = this.color3(options.color);
    this.material.backFaceCulling = false;
    this.material.alpha = 0.85;
    this.scene.setRenderingAutoClearDepthStencil(LIGHT_HELPER_RENDERING_GROUP, true);
    this.build();
    this.createLightGizmo();
  }

  public setColor(color: IColor): void {
    this.options.color = color;
    this.material.emissiveColor = this.color3(color);
    if (this.lightGizmo) this.lightGizmo.material.emissiveColor = this.color3(color);
  }

  public rebuild(changes: Partial<Pick<LightHelperOptions, 'angle' | 'size'>>): void {
    this.options = { ...this.options, ...changes };
    this.clearMeshes();
    this.build();
    if (this.selected) this.buildOutline();
  }

  public setVisualsVisible(visible: boolean): void {
    this.root.setEnabled(visible);
  }

  public setLightGizmoVisible(visible: boolean): void {
    if (visible) {
      this.createLightGizmo();
    } else {
      this.disposeLightGizmo();
    }
  }

  public setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    if (selected) {
      this.buildOutline();
    } else {
      this.clearOutline();
    }
  }

  public dispose(): void {
    this.setSelected(false);
    this.disposeLightGizmo();
    this.clearMeshes();
    this.outlineMaterial?.dispose();
    this.material.dispose();
    this.root.dispose();
  }

  private build(): void {
    const { type } = this.options;

    // Invisible pick target around the gizmo: carries the usual pick/pointer
    // behavior in the main scene (where the utility-layer gizmo pick would be
    // skipped) and covers the ring around the gizmo's screen-sized sphere.
    const pickBall = MeshBuilder.CreateSphere(
      `${this.options.name}_pickTarget`,
      { diameter: this.size * 0.04 },
      this.scene,
    );
    this.register(pickBall);
    pickBall.visibility = 0;

    switch (type) {
      case 'Spot':
        this.buildSpotCone();
        break;
      case 'Directional':
        this.buildArrow(this.size * 0.6);
        break;
      case 'Ambient':
        this.buildArrow(this.size * 0.3);
        break;
      default:
        break;
    }
  }

  private buildSpotCone(): void {
    const length = this.size * 0.6;
    const baseRadius = Math.tan(this.options.angle / 2) * length;
    const cone = MeshBuilder.CreateCylinder(
      `${this.options.name}_cone`,
      { height: length, diameterTop: 0, diameterBottom: baseRadius * 2, tessellation: 24 },
      this.scene,
    );
    cone.rotation.x = -Math.PI / 2;
    cone.position.z = length / 2;
    cone.visibility = LightHelper.SPOT_CONE_VISIBILITY;
    this.register(cone);
  }

  private buildArrow(length: number, sign: 1 | -1 = 1): void {
    const radius = this.size * 0.006;
    const shaftLength = length * 0.75;
    const headLength = length * 0.25;

    const shaft = MeshBuilder.CreateCylinder(
      `${this.options.name}_arrowShaft`,
      { height: shaftLength, diameter: radius * 2, tessellation: 12 },
      this.scene,
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = (sign * shaftLength) / 2;
    this.register(shaft);

    const head = MeshBuilder.CreateCylinder(
      `${this.options.name}_arrowHead`,
      { height: headLength, diameterTop: 0, diameterBottom: radius * 6, tessellation: 16 },
      this.scene,
    );
    head.rotation.x = (sign * Math.PI) / 2;
    head.position.z = sign * (shaftLength + headLength / 2);
    this.register(head);
  }

  private register(mesh: Mesh): Mesh {
    mesh.parent = this.root;
    mesh.material = this.material;
    mesh.renderingGroupId = LIGHT_HELPER_RENDERING_GROUP;
    mesh.isPickable = true;
    Tags.AddTagsTo(mesh, LIGHT_HELPER_TAG);
    if (this.options.onPick) {
      mesh.actionManager = new ActionManager(this.scene);
      mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => this.options.onPick?.()),
      );
    }
    this.meshes.push(mesh);
    return mesh;
  }

  private createLightGizmo(): void {
    if (this.lightGizmo) return;
    const gizmo = new LightGizmo(acquireUtilityLayer(this.scene));
    // The gizmo drives position and direction directly into the light it is
    // attached to: its feedback loop compares the attached mesh's world-space
    // forward with light.direction (a parent-local property) and pushes both
    // back into the light. For a DirectionalLight this wedges, because its
    // constructor pre-seeds position with -direction, and the world-vs-local
    // comparison corrupts direction whenever the proxy rotates. So for every
    // light whose direction/position would be driven, the gizmo attaches to a
    // detached anchor light instead, mirroring only the geometry to visualise.
    let attached: Light = this.options.light;
    if (this.options.type === 'Ambient') {
      const anchor = new PointLight(`${this.options.name}_gizmoAnchor`, Vector3.Zero(), this.scene);
      this.gizmoAnchorLight = this.wireAnchorLight(anchor);
      attached = anchor;
    } else if (this.options.type === 'Directional') {
      const anchor = new DirectionalLight(
        `${this.options.name}_gizmoAnchor`,
        Vector3.Forward(),
        this.scene,
      );
      // The DirectionalLight constructor seeds position with -direction; zero
      // it so the gizmo sits on the pick target instead of behind the arrow.
      anchor.position = Vector3.Zero();
      this.gizmoAnchorLight = this.wireAnchorLight(anchor);
      attached = anchor;
    } else if (this.options.type === 'Spot') {
      // A Spot anchor keeps the spot-cone visualisation; the gizmo's cone mesh
      // ignores angle/exponent, so those only matter for correctness of the
      // detached anchor itself.
      const anchor = new SpotLight(
        `${this.options.name}_gizmoAnchor`,
        Vector3.Zero(),
        Vector3.Forward(),
        this.options.angle,
        SPOT_EXPONENT_DEFAULT,
        this.scene,
      );
      this.gizmoAnchorLight = this.wireAnchorLight(anchor);
      attached = anchor;
    }
    gizmo.light = attached;
    // Emissive-only so the gizmo renders exactly the light's color, instead of
    // blending with the utility layer's shared gizmo light.
    gizmo.material.disableLighting = true;
    gizmo.material.emissiveColor = this.color3(this.options.color);
    gizmo.onClickedObservable.add(() => this.options.onPick?.());
    this.lightGizmo = gizmo;
    this.lightDisposeObserver = this.options.light.onDisposeObservable.addOnce(() => {
      if (this.lightGizmo !== gizmo) return;
      this.lightGizmo = undefined;
      this.lightDisposeObserver = undefined;
      gizmo.dispose();
      this.releaseGizmoAnchorLight();
      releaseUtilityLayer(this.scene);
    });
  }

  private wireAnchorLight(anchor: Light): Light {
    anchor.parent = this.options.light.parent;
    anchor.intensity = 0;
    anchor.diffuse = Color3.Black();
    return anchor;
  }

  private releaseGizmoAnchorLight(): void {
    this.gizmoAnchorLight?.dispose();
    this.gizmoAnchorLight = undefined;
  }

  private disposeLightGizmo(): void {
    const gizmo = this.lightGizmo;
    if (!gizmo) return;
    this.lightGizmo = undefined;
    this.lightDisposeObserver?.remove();
    this.lightDisposeObserver = undefined;
    gizmo.dispose();
    this.releaseGizmoAnchorLight();
    releaseUtilityLayer(this.scene);
  }

  private clearMeshes(): void {
    this.clearOutline();
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes = [];
  }

  private buildOutline(): void {
    if (this.outlineMeshes.length > 0) return;
    const material = this.getOutlineMaterial();
    for (const mesh of this.meshes) {
      // Invisible and translucent meshes (pick target, spot cone) must not
      // gain visible outlines.
      if (mesh.visibility < 1) continue;
      const outline = mesh.clone(`${mesh.name}_outline`);
      outline.parent = this.root;
      outline.scaling.scaleInPlace(LightHelper.OUTLINE_SCALE);
      outline.material = material;
      // Rendered before the helper group (which clears its depth buffer and
      // draws over the hull, leaving only the ring around the silhouette).
      outline.renderingGroupId = LIGHT_HELPER_RENDERING_GROUP - 1;
      outline.isPickable = false;
      outline.actionManager = null;
      this.outlineMeshes.push(outline);
    }
  }

  private clearOutline(): void {
    for (const mesh of this.outlineMeshes) {
      mesh.dispose();
    }
    this.outlineMeshes = [];
  }

  private getOutlineMaterial(): StandardMaterial {
    if (!this.outlineMaterial) {
      this.outlineMaterial = new StandardMaterial(`${this.options.name}_outlineMat`, this.scene);
      this.outlineMaterial.disableLighting = true;
      this.outlineMaterial.emissiveColor = getSelectedColor();
      this.outlineMaterial.backFaceCulling = false;
    }
    return this.outlineMaterial;
  }

  private get size(): number {
    return this.options.size;
  }

  private color3(color: IColor): Color3 {
    return new Color3(color.r / 255, color.g / 255, color.b / 255);
  }
}
