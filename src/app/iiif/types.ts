/** Loose JSON types for the part of IIIF Presentation 4.0 we use. */
export const PRESENTATION_4_CONTEXT = 'http://iiif.io/api/presentation/4/context.json';

export type LanguageMap = Record<string, string[]>;

export interface Reference {
  id: string;
  type: string;
}

export interface PointSelector {
  type: 'PointSelector';
  x?: number;
  y?: number;
  z?: number;
  instant?: number;
}

export interface PolygonZSelector {
  type: 'PolygonZSelector';
  value: string;
}

export type Selector = PointSelector | PolygonZSelector | { type: string; [key: string]: unknown };

export interface Transform {
  type: 'ScaleTransform' | 'RotateTransform' | 'TranslateTransform';
  x?: number;
  y?: number;
  z?: number;
}

export interface Value {
  type: 'Value';
  value: number;
  unit?: string;
}

export interface Resource {
  id?: string;
  type: string;
  format?: string;
  label?: LanguageMap;
  [key: string]: unknown;
}

export interface SpecificResource {
  id?: string;
  type: 'SpecificResource';
  source: Resource | Reference | Array<Resource | Reference>;
  selector?: Selector | Selector[];
  transform?: Transform[];
}

export interface TextualBody {
  id?: string;
  type: 'TextualBody';
  value: string;
  format?: string;
  language?: string | string[];
  label?: LanguageMap;
}

export type AnnotationBody = Resource | SpecificResource | TextualBody;
export type AnnotationTarget = Reference | SpecificResource;

export interface Annotation {
  id: string;
  type: 'Annotation';
  motivation?: string | string[];
  body?: AnnotationBody | AnnotationBody[];
  bodyValue?: string;
  target: AnnotationTarget | AnnotationTarget[];
  scope?: Reference | Reference[];
  behavior?: string[];
  exclude?: string[];
  label?: LanguageMap;
}

export interface AnnotationPage {
  id: string;
  type: 'AnnotationPage';
  items?: Annotation[];
}

export interface Scene {
  id: string;
  type: 'Scene';
  label?: LanguageMap;
  backgroundColor?: string;
  items?: AnnotationPage[];
  annotations?: AnnotationPage[];
}

export interface Manifest {
  '@context'?: string | string[];
  id: string;
  type: 'Manifest';
  label: LanguageMap;
  items: Array<Scene | Resource>;
  annotations?: AnnotationPage[];
}
