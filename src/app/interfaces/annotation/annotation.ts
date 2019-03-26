export interface Annotation {
  _id: string;
  relatedModel: string;
  ranking: string;
  referencePoint: Array<{ dimension: string; value: number }>;
  referencePointNormal: Array<{ dimension: string; value: number }>;
  cameraPosition: Array<{ dimension: string; value: number }>;
  preview: any;
  originatorID: string;
  validated: boolean;
  title: string;
  description: string;
  date: string;
  _rev?: string;
}
