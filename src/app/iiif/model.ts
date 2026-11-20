import type { RGB } from './color';
import type { Vec3 } from './coordinates';

/** All vectors in this model are in IIIF space (right-handed). */
export interface IIIFTransform {
  kind: 'scale' | 'rotate' | 'translate';
  value: Vec3;
}

export interface IIIFModelItem {
  annotationId: string;
  url: string;
  format?: string;
  transforms: IIIFTransform[];
  /** PointSelector in the target of the painting annotation */
  position?: Vec3;
}

export interface IIIFCanvasItem {
  annotationId: string;
  /** Raw Canvas JSON from manifest.items */
  canvas: Record<string, any>;
  /** Value of the PolygonZSelector, e.g. "POLYGONZ((0 0 0, ...))" (older draft form) */
  polygonZ?: string;
  /**
   * Corners in IIIF Scene space (top-left, top-right, bottom-right, bottom-left), computed
   * from the Canvas size, the body transforms and the target PointSelector.
   */
  corners?: Vec3[];
}

export type CameraProjection = 'perspective' | 'orthographic';

export interface IIIFCameraItem {
  annotationId: string;
  /** ID of the camera resource (painting body/source id), used by spec-style `scope` references */
  resourceId?: string;
  projection: CameraProjection;
  label?: string;
  position?: Vec3;
  lookAtAnnotationId?: string;
  lookAtPoint?: Vec3;
  transforms: IIIFTransform[];
  /** degrees */
  fieldOfView?: number;
  near?: number;
  far?: number;
  /** behavior: ["hidden"] – e.g. the camera of a comment */
  hidden: boolean;
}

export type LightKind = 'ambient' | 'directional' | 'point' | 'spot';

export interface IIIFLightItem {
  annotationId: string;
  kind: LightKind;
  color?: RGB;
  intensity?: number;
  /** degrees (SpotLight only) */
  angle?: number;
  position?: Vec3;
  lookAtAnnotationId?: string;
  lookAtPoint?: Vec3;
  transforms: IIIFTransform[];
}

export interface IIIFComment {
  annotationId: string;
  title: string;
  description: string;
  point: Vec3;
  /** ID of the camera annotation in `cameras` referenced by `scope`, resolved after parsing */
  cameraAnnotationId?: string;
}

export interface IIIFSceneModel {
  manifestId: string;
  label: string;
  sceneId: string;
  backgroundColor?: RGB;
  models: IIIFModelItem[];
  canvases: IIIFCanvasItem[];
  cameras: IIIFCameraItem[];
  lights: IIIFLightItem[];
  /** in document order = Kompakkt ranking */
  comments: IIIFComment[];
  warnings: string[];
}
