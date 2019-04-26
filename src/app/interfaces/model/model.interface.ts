interface IFile {
  file_name: string;
  file_link: string;
  file_size: number;
  file_format: string;
}

export interface Model {
  _id?: string;
  relatedDigitalObject?: { _id: string };
  mediaType?: string;
  name: string;
  cameraPosition?: Array<{ dimension: string; value: number }>;
  referencePoint?: Array<{ dimension: string; value: number }>;
  ranking?: number;
  files: IFile[];
  finished: boolean;
  online: boolean;
  dataSource?: {
    isExternal: boolean;
    service?: string;
  };
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
