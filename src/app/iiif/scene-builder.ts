import { Injectable, inject } from '@angular/core';
import {
  AbstractMesh,
  Axis,
  Camera,
  Color3,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  PBRMaterial,
  Quaternion,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import type { IAnnotation, ICameraPerspective, IEntitySettings } from 'src/common';
import { minimalSettings } from '../../assets/settings/settings';
import { BabylonService } from '../services/babylon/babylon.service';
import type { RGB } from './color';
import { hexToRgb } from './color';
import { commentToAnnotation } from './comments';
import { pointToBabylon, rotationToBabylon, type Vec3 } from './coordinates';
import type {
  IIIFCameraItem,
  IIIFCanvasItem,
  IIIFLightItem,
  IIIFModelItem,
  IIIFSceneModel,
  IIIFTransform,
} from './model';

export interface IIIFBuildResult {
  meshes: AbstractMesh[];
  annotations: IAnnotation[];
  entitySettings: IEntitySettings;
  hasExplicitLights: boolean;
  hasExplicitCamera: boolean;
  /** applies the manifest's default camera or positions the camera automatically */
  applyCamera: () => void;
}

interface LookAtSource {
  lookAtAnnotationId?: string;
  lookAtPoint?: Vec3;
}

const DEG_TO_RAD = Math.PI / 180;
const toVector3 = (v: Vec3) => new Vector3(v.x, v.y, v.z);
const toBabylonVector = (iiifPoint: Vec3) => toVector3(pointToBabylon(iiifPoint));
const rgbToColor3 = ({ r, g, b }: RGB) => new Color3(r / 255, g / 255, b / 255);

/** Rotation X, then Y, then Z – same as the previous importer. */
const rotationQuaternion = (iiifDegrees: Vec3) => {
  const r = rotationToBabylon(iiifDegrees);
  return Quaternion.RotationAxis(Axis.X, r.x * DEG_TO_RAD)
    .multiply(Quaternion.RotationAxis(Axis.Y, r.y * DEG_TO_RAD))
    .multiply(Quaternion.RotationAxis(Axis.Z, r.z * DEG_TO_RAD));
};

/** Direction vectors for cameras and lights, via Euler angles as before. */
const rotateDirection = (direction: Vector3, transforms: IIIFTransform[]) =>
  transforms
    .filter(t => t.kind === 'rotate')
    .reduce((current, t) => {
      const r = rotationToBabylon(t.value);
      const q = Quaternion.FromEulerAngles(r.x * DEG_TO_RAD, r.y * DEG_TO_RAD, r.z * DEG_TO_RAD);
      return current.applyRotationQuaternion(q).normalize();
    }, direction.clone());

const applyTransforms = (node: TransformNode, transforms: IIIFTransform[]) => {
  for (const transform of transforms) {
    if (transform.kind === 'scale') {
      const v = toVector3(transform.value);
      node.scaling = node.scaling.multiply(v);
      node.position = node.position.multiply(v);
    }
    if (transform.kind === 'rotate') {
      const net = rotationQuaternion(transform.value).multiply(
        Quaternion.FromEulerVector(node.rotation),
      );
      node.rotation = net.toEulerAngles();
      node.position.applyRotationQuaternionInPlace(net);
    }
    if (transform.kind === 'translate') {
      node.position.addInPlace(toBabylonVector(transform.value));
    }
  }
};

const getMeshBounds = (meshes: AbstractMesh[]) => {
  const boxes = meshes.filter(m => !m.isDisposed()).map(m => {
    m.computeWorldMatrix(true);
    return m.getBoundingInfo().boundingBox;
  });
  if (!boxes.length) return undefined;
  const min = boxes.map(b => b.minimumWorld).reduce((a, b) => Vector3.Minimize(a, b));
  const max = boxes.map(b => b.maximumWorld).reduce((a, b) => Vector3.Maximize(a, b));
  return { min, max, size: max.subtract(min), center: min.add(max).scale(0.5) };
};

const parsePolygonZ = (value: string): Vector3[] | undefined => {
  const match = value.match(/POLYGONZ\s*\(\((.*)\)\)/i);
  if (!match) return undefined;
  const points = match[1]
    .split(',')
    .map(point => point.trim().split(/\s+/).map(Number))
    .filter(point => point.length === 3 && point.every(Number.isFinite))
    .map(([x, y, z]) => toBabylonVector({ x, y, z }));
  return points.length >= 4 ? points : undefined;
};

const getCanvasImageUrl = (canvas: Record<string, any>): string | undefined => {
  for (const page of Array.isArray(canvas?.['items']) ? canvas['items'] : []) {
    for (const annotation of Array.isArray(page?.items) ? page.items : []) {
      const body = Array.isArray(annotation?.body) ? annotation.body[0] : annotation?.body;
      if (body?.type !== 'Image' || !body?.id) continue;
      const service = Array.isArray(body.service) ? body.service[0] : body.service;
      const serviceId = service?.id ?? service?.['@id'];
      return serviceId ? `${serviceId}/full/1024,/0/default.jpg` : body.id;
    }
  }
  return undefined;
};

const getCanvasUVs = (canvas: Record<string, any>, polygon: Vector3[]) => {
  const draftOrderUVs = [0, 0, 0, 1, 1, 1, 1, 0];
  const reversedOrderUVs = [0, 0, 1, 0, 1, 1, 0, 1];
  const width = Number(canvas?.['width'] ?? 0);
  const height = Number(canvas?.['height'] ?? 0);
  if (polygon.length < 4 || width <= 0 || height <= 0 || width === height) return draftOrderUVs;
  const firstEdge = Vector3.Distance(polygon[0], polygon[1]);
  const closingEdge = Vector3.Distance(polygon[0], polygon[3]);
  if (firstEdge === 0 || closingEdge === 0) return draftOrderUVs;
  const edgeRatio = firstEdge / closingEdge;
  return Math.abs(edgeRatio - width / height) < Math.abs(edgeRatio - height / width)
    ? reversedOrderUVs
    : draftOrderUVs;
};

@Injectable({ providedIn: 'root' })
export class IIIFSceneBuilderService {
  private babylon = inject(BabylonService);

  public async build(model: IIIFSceneModel): Promise<IIIFBuildResult> {
    const scene = this.babylon.getScene();
    const entitySettings = structuredClone(minimalSettings) as IEntitySettings;
    (entitySettings as any).skipInitialCameraSetup = true;
    scene.environmentIntensity = 1;

    if (model.backgroundColor) {
      const color = { ...model.backgroundColor, a: 1 };
      entitySettings.background = { color, effect: false };
      this.babylon.setBackgroundColor(color);
      this.babylon.setBackgroundImage(false);
      this.babylon.hideBackgroundHelpers();
    }

    const meshes: AbstractMesh[] = [];
    const transformNodes: TransformNode[] = [];
    const annotationPositions = new Map<string, Vector3>();

    for (const item of model.models) {
      const node = await this.buildModel(item, meshes);
      if (!node) continue;
      transformNodes.push(node);
      annotationPositions.set(item.annotationId, node.position.clone());
    }
    for (const item of model.canvases) {
      const node = this.buildCanvas(item, meshes);
      if (node) transformNodes.push(node);
    }

    const builtLights = model.lights.map(light => this.buildLight(light, annotationPositions));
    const hasExplicitLights = builtLights.some(Boolean);
    if (hasExplicitLights && meshes.length) {
      scene.environmentIntensity = 0;
      meshes.forEach(mesh => {
        if (mesh.material instanceof PBRMaterial) mesh.material.environmentIntensity = 0;
      });
    }

    const defaultCamera = model.cameras.find(camera => !camera.hidden);
    const applyCamera = defaultCamera
      ? () => this.applyExplicitCamera(defaultCamera, annotationPositions, meshes)
      : () => this.automoveCamera(transformNodes);

    const annotations = this.buildAnnotations(model, meshes);

    return {
      meshes,
      annotations,
      entitySettings,
      hasExplicitLights,
      hasExplicitCamera: !!defaultCamera,
      applyCamera,
    };
  }

  /** Previous importer behavior. Replaced in Task 4. */
  protected buildAnnotations(model: IIIFSceneModel, _meshes: AbstractMesh[]): IAnnotation[] {
    return model.comments.map((comment, index) => {
      const target = pointToBabylon(comment.point);
      const n = Vector3.Zero().subtract(toVector3(target)).normalize();
      const legacy: ICameraPerspective = {
        cameraType: 'ArcRotateCamera',
        position: { x: n.x, y: n.y, z: n.z },
        target,
        preview: '',
      };
      return commentToAnnotation(comment, index + 1, legacy, { x: n.x, y: n.y, z: n.z });
    });
  }

  private async buildModel(item: IIIFModelItem, meshes: AbstractMesh[]) {
    const loaded = await this.babylon.addEntityToScene(item.url);
    if (!loaded?.length) {
      console.warn('[IIIF] Model could not be loaded', item.url);
      return undefined;
    }
    meshes.push(...loaded);
    const node = new TransformNode(`transformNode-${item.url}`, this.babylon.getScene());
    loaded.filter(mesh => !mesh.parent).forEach(mesh => mesh.setParent(node));
    applyTransforms(node, item.transforms);
    if (item.position) node.position.addInPlace(toBabylonVector(item.position));
    return node;
  }

  private buildCanvas(item: IIIFCanvasItem, meshes: AbstractMesh[]) {
    const polygon = parsePolygonZ(item.polygonZ);
    if (!polygon) {
      console.warn('[IIIF] Invalid PolygonZSelector', item);
      return undefined;
    }
    const scene = this.babylon.getScene();
    const canvas = item.canvas;
    const canvasId = String(canvas['id'] ?? 'iiif-canvas');
    const uvs = getCanvasUVs(canvas, polygon);
    const background =
      typeof canvas['backgroundColor'] === 'string'
        ? hexToRgb(canvas['backgroundColor'])
        : undefined;
    const backgroundColor = background ? rgbToColor3(background) : Color3.White();

    const createSide = (name: string, indices: number[], material: StandardMaterial) => {
      const plane = new Mesh(name, scene);
      const vertexData = new VertexData();
      vertexData.positions = polygon.flatMap(point => point.asArray());
      vertexData.indices = indices;
      vertexData.uvs = uvs;
      const normals: number[] = [];
      VertexData.ComputeNormals(vertexData.positions, vertexData.indices, normals);
      vertexData.normals = normals;
      vertexData.applyToMesh(plane);
      plane.material = material;
      plane.renderingGroupId = 1;
      return plane;
    };

    const imageUrl = getCanvasImageUrl(canvas);
    const texture = imageUrl ? new Texture(imageUrl, scene, false, true) : undefined;
    const imageMaterial = new StandardMaterial(`${canvasId}-image-material`, scene);
    imageMaterial.diffuseColor = imageUrl ? Color3.White() : backgroundColor;
    if (texture) {
      imageMaterial.diffuseTexture = texture;
      imageMaterial.emissiveTexture = texture;
      imageMaterial.emissiveColor = Color3.White();
    }
    imageMaterial.backFaceCulling = true;

    const backgroundMaterial = new StandardMaterial(`${canvasId}-background-material`, scene);
    backgroundMaterial.diffuseColor = backgroundColor;
    backgroundMaterial.emissiveColor = backgroundColor;
    if (!background && texture) {
      backgroundMaterial.diffuseTexture = texture;
      backgroundMaterial.emissiveTexture = texture;
      backgroundMaterial.emissiveColor = Color3.White();
    }
    backgroundMaterial.backFaceCulling = true;

    const imagePlane = createSide(`${canvasId}-image`, [0, 1, 2, 0, 2, 3], imageMaterial);
    const backgroundPlane = createSide(
      `${canvasId}-background`,
      [0, 2, 1, 0, 3, 2],
      backgroundMaterial,
    );
    const node = new TransformNode(`transformNode-${canvasId}`, scene);
    imagePlane.setParent(node);
    backgroundPlane.setParent(node);
    meshes.push(imagePlane, backgroundPlane);
    return node;
  }

  protected resolveLookAt(source: LookAtSource, positions: Map<string, Vector3>) {
    if (source.lookAtAnnotationId) return positions.get(source.lookAtAnnotationId);
    if (source.lookAtPoint) return toBabylonVector(source.lookAtPoint);
    return undefined;
  }

  /** Returns true if a light was created. */
  protected buildLight(light: IIIFLightItem, positions: Map<string, Vector3>): boolean {
    const scene = this.babylon.getScene();
    const intensity = light.intensity ?? 1;
    const diffuse = light.color ? rgbToColor3(light.color) : Color3.White();

    if (light.kind === 'ambient') {
      const ambient = new HemisphericLight(light.annotationId, Vector3.Up(), scene);
      ambient.diffuse = diffuse;
      ambient.groundColor = diffuse;
      ambient.specular = Color3.Black();
      ambient.intensity = intensity;
      return true;
    }

    if (light.kind === 'directional') {
      const position = light.position ? toBabylonVector(light.position) : Vector3.Zero();
      const lookAt = this.resolveLookAt(light, positions);
      const base = lookAt ? lookAt.subtract(position).normalize() : Vector3.Down();
      const directional = new DirectionalLight(
        light.annotationId,
        rotateDirection(base, light.transforms),
        scene,
      );
      directional.diffuse = diffuse;
      directional.position = position;
      directional.intensity = intensity;
      return true;
    }

    console.warn(`[IIIF] Light type "${light.kind}" is not supported yet`);
    return false;
  }

  private applyExplicitCamera(
    camera: IIIFCameraItem,
    positions: Map<string, Vector3>,
    meshes: AbstractMesh[],
  ) {
    const bounds = getMeshBounds(meshes);
    const translation = camera.transforms
      .filter(t => t.kind === 'translate')
      .reduce<
        Vector3 | undefined
      >((sum, t) => (sum ?? Vector3.Zero()).add(toBabylonVector(t.value)), undefined);
    const position = camera.position
      ? toBabylonVector(camera.position)
      : (translation ?? Vector3.Zero());
    const direction = camera.transforms.some(t => t.kind === 'rotate')
      ? rotateDirection(new Vector3(0, 0, -1), camera.transforms)
      : undefined;
    const target =
      this.resolveLookAt(camera, positions) ??
      (direction
        ? position.add(
            direction.scale(bounds ? Math.max(Vector3.Distance(position, bounds.center), 1) : 1),
          )
        : (bounds?.center ?? position.add(new Vector3(0, 0, -1))));

    this.babylon.cameraManager.setCameraType('ArcRotateCamera');
    const active = this.babylon.getScene().activeCamera as any;
    active.setTarget(target, true);
    if (typeof active.setPosition === 'function') {
      active.setPosition(position.clone());
    } else {
      active.position = position.clone();
    }

    const mode =
      camera.projection === 'orthographic' ? Camera.ORTHOGRAPHIC_CAMERA : Camera.PERSPECTIVE_CAMERA;
    active.mode = mode;
    if (mode === Camera.ORTHOGRAPHIC_CAMERA) {
      const canvas = this.babylon.getCanvas();
      const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
      const halfHeight = bounds
        ? Math.max(bounds.size.y / 2, bounds.size.x / (2 * aspect), bounds.size.z / 2, 1) * 1.2
        : 1;
      active.orthoTop = halfHeight;
      active.orthoBottom = -halfHeight;
      active.orthoLeft = -halfHeight * aspect;
      active.orthoRight = halfHeight * aspect;
    }
    active.attachControl(this.babylon.getCanvas(), false);
    if (camera.fieldOfView !== undefined) active.fov = camera.fieldOfView * DEG_TO_RAD;
  }

  private automoveCamera(transformNodes: TransformNode[]) {
    const boxes = transformNodes
      .flatMap(node => {
        node.computeWorldMatrix(true);
        return node.getChildMeshes(false).filter((m): m is Mesh => m instanceof Mesh);
      })
      .map(mesh => {
        mesh.computeWorldMatrix(true);
        return mesh.getBoundingInfo().boundingBox;
      })
      .filter(box => box.extendSizeWorld.asArray().some(v => v > 0));
    if (!boxes.length) return;

    const center = boxes
      .reduce((sum, box) => sum.add(box.centerWorld), Vector3.Zero())
      .scale(1 / boxes.length);
    const maxExtend = Math.max(
      ...boxes.flatMap(box =>
        [...box.maximumWorld.asArray(), ...box.minimumWorld.asArray()].map(Math.abs),
      ),
    );

    this.babylon.cameraManager.setActiveCameraTarget(center);
    this.babylon.cameraManager.moveActiveCameraToPosition(
      new Vector3(Math.PI / 2, Math.PI / 2, maxExtend * 2.5),
    );
  }
}
