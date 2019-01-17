export interface Model {
  _id?: string;
  relatedDigitalObject?: { _id: string };
  name: string;
  cameraPosition?: { dimension: string, value: number }[];
  referencePoint?: { dimension: string, value: number }[];
  ranking?: number;
  files: Array<string>;
  finished: boolean;
  online: boolean;
  processed?: {
    time: {
      start: string;
      end: string;
      total: string;
    };
    low: string;
    medium: string;
    high: string;
    raw: string;
  };
  preview?: string;
  settings?: {
    preview: string;

    cameraPositionInitial: {
      cameraType: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
    }[];

    background: {
      color: {
        r: number;
        g: number;
        b: number;
        a: number;
      };
      effect: boolean;
    };

    lights: {
      type: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
      intensity: number;
    } [];
  };
}
