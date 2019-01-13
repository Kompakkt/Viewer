export interface Model {
    _id?: string;
    relatedDigitalObject?: {_id: string};
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
}
