import { Injectable, inject } from '@angular/core';
import {
  AbstractMesh,
  Camera,
  Color3,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  PBRMaterial,
  PointLight,
  Ray,
  SpotLight,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import type { IAnnotation, IEntitySettings } from 'src/common';
import { minimalSettings } from '../../assets/settings/settings';
import { BabylonService } from '../services/babylon/babylon.service';
import type { RGB } from './color';
import { hexToRgb } from './color';
import { commentToAnnotation, perspectiveAlongNormal, perspectiveFromCamera } from './comments';
import { pointToBabylon, pointToIIIF, type Vec3 } from './coordinates';
import type { ExportCamera } from './exporter';
import type {
  IIIFCameraItem,
  IIIFCanvasItem,
  IIIFLightItem,
  IIIFModelItem,
  IIIFSceneModel,
  IIIFTransform,
} from './model';
import { composeIIIFTransforms, rotateDirection } from './placement';

export interface IIIFBuildResult {
  meshes: AbstractMesh[];
  annotations: IAnnotation[];
  entitySettings: IEntitySettings;
  hasExplicitLights: boolean;
  hasExplicitCamera: boolean;
  /** applies the manifest's default camera or positions the camera automatically */
  applyCamera: () => void;
  /** Cameras of the default camera's Choice (empty without a Choice); the first is the default. */
  cameraChoices: IIIFCameraChoice[];
  /** Loaded models with their meshes, in manifest order (used by the IIIF export). */
  models: IIIFLoadedModel[];
  /** The manifest's default camera as displayed (for the IIIF export); undefined without one. */
  describeCamera?: () => ExportCamera;
}

export interface IIIFLoadedModel {
  url: string;
  meshes: AbstractMesh[];
}

export interface IIIFCameraChoice {
  id: string;
  label: string;
  apply: () => void;
}

interface LookAtSource {
  lookAtAnnotationId?: string;
  lookAtPoint?: Vec3;
}

const DEG_TO_RAD = Math.PI / 180;
const SPOT_LIGHT_EXPONENT = 2;
const toVector3 = (v: Vec3) => new Vector3(v.x, v.y, v.z);
const toBabylonVector = (iiifPoint: Vec3) => toVector3(pointToBabylon(iiifPoint));
const rgbToColor3 = ({ r, g, b }: RGB) => new Color3(r / 255, g / 255, b / 255);

/** Places the model node: IIIF transforms in document order (see placement.ts for the conventions). */
const applyTransforms = (node: TransformNode, transforms: IIIFTransform[]) => {
  const { scaling, rotation, position } = composeIIIFTransforms(transforms);
  node.scaling = scaling;
  node.rotationQuaternion = rotation;
  node.position = position;
};

const getMeshBounds = (meshes: AbstractMesh[]) => {
  const boxes = meshes
    .filter(m => !m.isDisposed())
    .map(m => {
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

/**
 * Triangle indices for the image side and the background side of a Canvas quad.
 * The image side faces where the Canvas front points: the side from which top-left → top-right
 * runs to the right and top-left → bottom-left runs down, i.e. (TR - TL) × (TL - BL) in IIIF space.
 */
const canvasFaceIndices = (corners: Vec3[], polygon: Vector3[]): [number[], number[]] => {
  const [tl, tr, , bl] = corners.map(c => new Vector3(c.x, c.y, c.z));
  const frontIIIF = Vector3.Cross(tr.subtract(tl), tl.subtract(bl));
  const front = toBabylonVector({ x: frontIIIF.x, y: frontIIIF.y, z: frontIIIF.z });
  const a: number[] = [0, 1, 2, 0, 2, 3];
  const b: number[] = [0, 2, 1, 0, 3, 2];
  const normals: number[] = [];
  VertexData.ComputeNormals(polygon.flatMap(p => p.asArray()), a, normals);
  const normalA = new Vector3(normals[0], normals[1], normals[2]);
  return Vector3.Dot(normalA, front) >= 0 ? [a, b] : [b, a];
};

/**
 * Half height of an orthographic view centred on `target` that shows the whole bounding box,
 * measured in the camera's view plane (the box may be off-centre).
 */
const orthoHalfHeightToFit = (
  bounds: ReturnType<typeof getMeshBounds>,
  position: Vector3,
  target: Vector3,
  aspect: number,
) => {
  if (!bounds) return 1;
  const forward = target.subtract(position);
  if (forward.lengthSquared() === 0) forward.set(0, 0, -1);
  forward.normalize();
  const worldUp = Math.abs(Vector3.Dot(forward, Vector3.Up())) > 0.999 ? Vector3.Forward() : Vector3.Up();
  const right = Vector3.Cross(worldUp, forward).normalize();
  const up = Vector3.Cross(forward, right).normalize();
  const { min, max } = bounds;
  let half = 0;
  for (const x of [min.x, max.x])
    for (const y of [min.y, max.y])
      for (const z of [min.z, max.z]) {
        const d = new Vector3(x, y, z).subtract(target);
        half = Math.max(half, Math.abs(Vector3.Dot(d, up)), Math.abs(Vector3.Dot(d, right)) / aspect);
      }
  return Math.max(half * 1.1, 0.01);
};

/** Placeholder preview for imported IIIF scenes (they have no Kompakkt preview image). */
export const IIIF_SCENE_PREVIEW = 'assets/image-not-found.png';

@Injectable({ providedIn: 'root' })
export class IIIFSceneBuilderService {
  private babylon = inject(BabylonService);

  public async build(model: IIIFSceneModel): Promise<IIIFBuildResult> {
    const scene = this.babylon.getScene();
    const entitySettings = structuredClone(minimalSettings) as IEntitySettings;
    (entitySettings as any).skipInitialCameraSetup = true;
    // An empty preview marks an entity as "still in upload", which blocks annotating.
    // Imported IIIF scenes have no Kompakkt preview, so use the placeholder image.
    entitySettings.preview = IIIF_SCENE_PREVIEW;
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

    const loadedModels: IIIFLoadedModel[] = [];
    for (const item of model.models) {
      const firstMesh = meshes.length;
      const node = await this.buildModel(item, meshes);
      if (!node) continue;
      loadedModels.push({ url: item.url, meshes: meshes.slice(firstMesh) });
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

    const cameraChoices: IIIFCameraChoice[] = defaultCamera?.choiceGroup
      ? model.cameras
          .filter(camera => camera.choiceGroup === defaultCamera.choiceGroup)
          .map((camera, index) => ({
            id: camera.annotationId,
            label:
              camera.label ??
              `${camera.projection === 'orthographic' ? 'Orthographic' : 'Perspective'} camera ${index + 1}`,
            apply: () => this.applyExplicitCamera(camera, annotationPositions, meshes),
          }))
      : [];

    return {
      meshes,
      annotations,
      entitySettings,
      hasExplicitLights,
      hasExplicitCamera: !!defaultCamera,
      applyCamera,
      cameraChoices,
      models: loadedModels,
      describeCamera: defaultCamera
        ? () => this.describeCamera(defaultCamera, annotationPositions, meshes)
        : undefined,
    };
  }

  protected buildAnnotations(model: IIIFSceneModel, meshes: AbstractMesh[]): IAnnotation[] {
    const bounds = getMeshBounds(meshes);
    const viewDistance = bounds ? Math.max(bounds.size.length() * 0.75, 1) : 3;

    return model.comments.map((comment, index) => {
      const target = pointToBabylon(comment.point);
      const normal = this.surfaceNormal(target, meshes, bounds);
      const camera = model.cameras.find(c => c.annotationId === comment.cameraAnnotationId);
      const perspective =
        (camera && perspectiveFromCamera(camera, comment.point)) ??
        perspectiveAlongNormal(target, normal, viewDistance);
      return commentToAnnotation(comment, index + 1, perspective, normal);
    });
  }

  /** Normal at the comment point via a raycast from outside; fallback: direction from the center. */
  private surfaceNormal(
    target: Vec3,
    meshes: AbstractMesh[],
    bounds: ReturnType<typeof getMeshBounds>,
  ): Vec3 {
    const point = toVector3(target);
    const outward = point.subtract(bounds?.center ?? Vector3.Zero());
    if (outward.lengthSquared() === 0) outward.copyFrom(Vector3.Up());
    outward.normalize();

    const reach = bounds ? bounds.size.length() : 1;
    const ray = new Ray(point.add(outward.scale(reach)), outward.negate(), reach * 2);
    const pick = this.babylon.getScene().pickWithRay(ray, mesh => meshes.includes(mesh));
    // The first hit may be a different surface (concave meshes, overhangs): only trust it near the point.
    const tolerance = bounds ? Math.max(bounds.size.length() * 0.02, 1e-4) : 1e-4;
    const nearPoint =
      !!pick?.hit && !!pick.pickedPoint && Vector3.Distance(pick.pickedPoint, point) <= tolerance;
    const normal = (nearPoint ? pick?.getNormal(true, true) : null) ?? outward;
    return { x: normal.x, y: normal.y, z: normal.z };
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
    const polygon = item.corners
      ? item.corners.map(corner => toBabylonVector(corner))
      : item.polygonZ
        ? parsePolygonZ(item.polygonZ)
        : undefined;
    if (!polygon) {
      console.warn('[IIIF] Invalid Canvas placement', item);
      return undefined;
    }
    const scene = this.babylon.getScene();
    const canvas = item.canvas;
    const canvasId = String(canvas['id'] ?? 'iiif-canvas');
    // Corners are ordered top-left, top-right, bottom-right, bottom-left (texture invertY: v = 1 is the top).
    const uvs = item.corners ? [0, 1, 1, 1, 1, 0, 0, 0] : getCanvasUVs(canvas, polygon);
    const [frontIndices, backIndices] = item.corners
      ? canvasFaceIndices(item.corners, polygon)
      : [
          [0, 1, 2, 0, 2, 3],
          [0, 2, 1, 0, 3, 2],
        ];
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

    const imagePlane = createSide(`${canvasId}-image`, frontIndices, imageMaterial);
    const backgroundPlane = createSide(`${canvasId}-background`, backIndices, backgroundMaterial);
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

    if (light.kind === 'point' || light.kind === 'spot') {
      const position = light.position ? toBabylonVector(light.position) : Vector3.Zero();
      if (light.kind === 'point') {
        const point = new PointLight(light.annotationId, position, scene);
        point.diffuse = diffuse;
        point.intensity = intensity;
        return true;
      }
      const lookAt = this.resolveLookAt(light, positions);
      const toLookAt = lookAt?.subtract(position);
      const direction =
        toLookAt && toLookAt.lengthSquared() > 1e-12
          ? toLookAt.normalize()
          : rotateDirection(Vector3.Down(), light.transforms);
      // IIIF angle is the half-angle in degrees; Babylon expects the full cone angle in radians.
      const halfAngle = Math.min(Math.max(light.angle ?? 90, 1e-3), 90);
      const spot = new SpotLight(
        light.annotationId,
        position,
        direction,
        2 * halfAngle * DEG_TO_RAD,
        SPOT_LIGHT_EXPONENT,
        scene,
      );
      spot.diffuse = diffuse;
      spot.intensity = intensity;
      return true;
    }

    console.warn(`[IIIF] Light type "${light.kind}" is not supported yet`);
    return false;
  }

  /** Position, target and orthographic half height the camera is displayed with (Babylon space). */
  private resolveCamera(
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

    const canvas = this.babylon.getCanvas();
    const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
    const halfHeight =
      camera.projection !== 'orthographic'
        ? undefined
        : camera.viewHeight !== undefined && camera.viewHeight > 0
          ? camera.viewHeight / 2
          : orthoHalfHeightToFit(bounds, position, target, aspect);
    return { position, target, halfHeight, aspect };
  }

  /** The camera as displayed, in IIIF space, for the IIIF export. */
  private describeCamera(
    camera: IIIFCameraItem,
    positions: Map<string, Vector3>,
    meshes: AbstractMesh[],
  ): ExportCamera {
    const { position, target, halfHeight } = this.resolveCamera(camera, positions, meshes);
    const toIIIF = (v: Vector3) => pointToIIIF({ x: v.x, y: v.y, z: v.z });
    return {
      projection: camera.projection,
      position: toIIIF(position),
      target: toIIIF(target),
      ...(halfHeight !== undefined ? { viewHeight: halfHeight * 2 } : {}),
      ...(camera.fieldOfView !== undefined ? { fieldOfView: camera.fieldOfView } : {}),
      ...(camera.near !== undefined ? { near: camera.near } : {}),
      ...(camera.far !== undefined ? { far: camera.far } : {}),
      ...(camera.label !== undefined ? { label: camera.label } : {}),
    };
  }

  private applyExplicitCamera(
    camera: IIIFCameraItem,
    positions: Map<string, Vector3>,
    meshes: AbstractMesh[],
  ) {
    const { position, target, halfHeight, aspect } = this.resolveCamera(camera, positions, meshes);

    this.babylon.cameraManager.setCameraType('ArcRotateCamera');
    const active = this.babylon.getScene().activeCamera as any;
    active.setTarget(target, true);
    if (typeof active.setPosition === 'function') {
      active.setPosition(position.clone());
    } else {
      active.position = position.clone();
    }

    active.mode = halfHeight !== undefined ? Camera.ORTHOGRAPHIC_CAMERA : Camera.PERSPECTIVE_CAMERA;
    if (halfHeight !== undefined) {
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
