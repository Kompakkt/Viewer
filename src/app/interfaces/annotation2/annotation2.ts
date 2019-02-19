// 11/02/19
export interface Annotation {

  _id: string;
  validated: boolean;

  identifier: string;
  ranking: number;
  creator: Agent;
  created: string;
  generator: Agent;
  generated?: string;
  motivation: string;
  lastModificationDate?: string;
  lastModifiedBy: Agent;

  body: Body;

  target: Target;
}

export interface Agent {

  type: string;
  name: string;
  _id: string;
  role: string[];
}

export interface Body {

  type: string;
  content: Content;
}

export interface Content {

  type: string;
  title: string;
  description: string;
  link?: string;
  relatedPerspective: CameraPerspective;
}

export interface CameraPerspective {

  camera: string;
  vector: Vector;
  preview: string;
}

export interface Vector {

  x: number;
  y: number;
  z: number;
}

export interface Target {

  source: Source;
  selector: Selector;
}

export interface Source {

  link?: string;
  relatedModel: string;
  relatedCompilation?: string;
}

export interface Selector {

  referencePoint: Vector;
  referenceNormal: Vector;
}
