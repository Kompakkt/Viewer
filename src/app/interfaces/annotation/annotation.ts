export interface Annotation {
  model: string;
  id: number;
  sequence: number;
  positionx: number;
  positiony: number;
  babylonVectorx: number;
  babylonVectory: number;
  babylonVectorz: number;
  validated: boolean;
  title: string;
  description: string;
  person: string;
  date: number;
  preview: string;
}
