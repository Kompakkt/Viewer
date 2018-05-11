export interface Annotation {
  id: number;
  title: string;
  description: string[];
  positionx: number;
  positiony: number;
  babylonVectorx: number;
  babylonVectory: number;
  babylonVectorz: number;
  precedence: number;
  person: string;
  date: number;
}
