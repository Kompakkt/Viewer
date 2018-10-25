export interface Annotation {
  _id: string;
  relatedModel: string;
  ranking: string;
  referencePoint: { dimension: string, value: number }[];
  referencePointNormal: { dimension: string, value: number }[];
  cameraPosition: { dimension: string, value: number }[];
  preview: any;
  originatorID: string;
  validated: boolean;
  title: string;
  description: string;
  date: string;
  _rev?: string;
}
