import {
  ActionManager,
  Color3,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Tags,
  TransformNode,
} from '@babylonjs/core';
import type { IColor } from '@kompakkt/common';
import type { LightType } from './light.service';

export const LIGHT_HELPER_TAG = 'lightHelper';
// Group 3 is unused by the rest of the scene; clearing its depth buffer keeps
// light helpers visible even when they sit inside the model.
const LIGHT_HELPER_RENDERING_GROUP = 3;

export interface LightHelperOptions {
  scene: Scene;
  name: string;
  type: LightType;
  color: IColor;
  size: number;
  angle: number;
  width: number;
  height: number;
  onPick?: () => void;
}

export class LightHelper {
  public readonly root: TransformNode;
  private readonly scene: Scene;
  private readonly material: StandardMaterial;
  private meshes: Mesh[] = [];
  private options: LightHelperOptions;

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
  }

  public setColor(color: IColor): void {
    this.options.color = color;
    this.material.emissiveColor = this.color3(color);
  }

  public rebuild(
    changes: Partial<Pick<LightHelperOptions, 'angle' | 'width' | 'height' | 'size'>>,
  ): void {
    this.options = { ...this.options, ...changes };
    this.clearMeshes();
    this.build();
  }

  public setVisible(visible: boolean): void {
    this.root.setEnabled(visible);
  }

  public dispose(): void {
    this.clearMeshes();
    this.material.dispose();
    this.root.dispose();
  }

  private build(): void {
    const { type } = this.options;
    this.register(
      MeshBuilder.CreateSphere(
        `${this.options.name}_marker`,
        { diameter: this.size * 0.05 },
        this.scene,
      ),
    );

    switch (type) {
      case 'Spot':
        this.buildSpotCone();
        break;
      case 'Directional':
        this.buildArrow(this.size * 0.6);
        break;
      case 'Area':
        this.buildArea();
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
    this.register(cone);
  }

  private buildArea(): void {
    const unit = this.size * 0.2;
    const plane = MeshBuilder.CreatePlane(
      `${this.options.name}_area`,
      { width: this.options.width * unit, height: this.options.height * unit },
      this.scene,
    );
    this.register(plane);
    // RectAreaLight emits from the rectangle along its local -Z axis.
    this.buildArrow(this.size * 0.3, -1);
  }

  private buildArrow(length: number, sign: 1 | -1 = 1): void {
    const radius = this.size * 0.01;
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

  private clearMeshes(): void {
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes = [];
  }

  private get size(): number {
    return this.options.size;
  }

  private color3(color: IColor): Color3 {
    return new Color3(color.r / 255, color.g / 255, color.b / 255);
  }
}
