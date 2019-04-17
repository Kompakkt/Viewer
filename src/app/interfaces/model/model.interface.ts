export interface Model {
  _id?: string;
  relatedDigitalObject?: { _id: string };
  mediaType?: string;
  name: string;
  cameraPosition?: Array<{ dimension: string; value: number }>;
  referencePoint?: Array<{ dimension: string; value: number }>;
  ranking?: number;
  files: string[];
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

    cameraPositionInitial: Array<{
      cameraType: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
    }>;

    background: {
      color: {
        r: number;
        g: number;
        b: number;
        a: number;
      };
      effect: boolean;
    };

    lights: Array<{
      type: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
      intensity: number;
    }>;
  };
}
