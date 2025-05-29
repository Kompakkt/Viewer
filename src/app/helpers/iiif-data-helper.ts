import { IAgent, IAnnotation } from 'src/common/interfaces';
import { Vector3 } from '@babylonjs/core';

export type IIIFData = {
  annotations: IIIFAnnotation[];
};

export type IIIFAnnotation = {
    id: number;
    normal: Vector3;
    position: Vector3;
    value: string;
}

export interface IIIFItem {
    "@context"?: string;
    id: string;
    type: string;
    label: { [key: string]: string[] };
    items?: IIIFItem[];
    motivation?: string[];
    backgroundColor?: string;
    body?: {
        id: string;
        source?: any[];
        type: string;
        transform: any[];
    };
    target?: {
        selector?: any;
        source?: any;
        type?: string;
    }
}

function hasKeys(obj: any, keys: string[]): boolean {
    return keys.every(key => key in obj);
}

export const isIIIFAnnotation = (annotation: any): annotation is IIIFAnnotation => {
    return hasKeys(annotation, ['id', 'normal', 'position', 'value']);
};

export const isIIIFManifest = (manifest: any): manifest is IIIFItem => {
    return hasKeys(manifest, ['id', 'type']) && manifest.type === 'Manifest';
}

export const isIIIFItem = (item: any): item is IIIFItem => {
    return hasKeys(item, ['id', 'type', 'label']);
}

export const isIIIFData = (data: any): data is IIIFData => {
    return hasKeys(data, ['annotations']) && Array.isArray(data.annotations) && data.annotations.every(isIIIFAnnotation);
};

export const convertIIIFAnnotation = ({ id, normal, position, value }: IIIFAnnotation, ranking: number): IAnnotation => {

    // Note: The IIIF astronaut example assumes a right-handed coordinate system.
    // Hence we have to flip the X axis
    console.log("Normale: ", normal);
    const conversionAgent = {
        _id: '',
        type: 'software',
        name: 'Kompakkt',
    } as IAgent;
    return {
        _id: id.toString(),
        ranking,
        body: {
            type: 'annotation',
            content: {
                type: 'text',
                title: value,
                description: '',
                relatedPerspective: {
                    cameraType: 'arcRotateCam',
                    position: position.add(normal.scale(3)),
                    target: position.multiply(new Vector3(-1, 1, 1)),
                    preview: 'https://kompakkt.uni-koeln.de:8080/previews/annotation/5e56525cd32cd0237c090355.png',
                },
            },
        },
        creator: conversionAgent,
        created: new Date().toISOString(),
        generator: conversionAgent,
        generated: new Date().toISOString(),
        lastModifiedBy: conversionAgent,
        lastModificationDate: new Date().toISOString(),
        identifier: id.toString(),
        validated: true,
        motivation: 'autoconversion from iiif to kompakkt',
        target: {
            source: {
                relatedEntity: 'standalone_entity',
                relatedCompilation: '',
            },
            selector: {
                referencePoint: position.multiply(new Vector3(-1, 1, 1)),
                referenceNormal: normal.multiply(new Vector3(-1, 1, 1)),
            },
        },
        positionXOnView: 0,
        positionYOnView: 0
    } as IAnnotation;
};

/* 
    * Recursively search for all items of a specific type in a IIIF manifest
    * @param item The item to search in
    * @param type The type of item to search for
    * @returns All items of the specified type found in the manifest

*/
export function getIIIFItems(item: IIIFItem, type: string): IIIFItem[] {
    const results: IIIFItem[] = [];
    if (item.type === type) {
        results.push(item);
    }
    if (item.items) {
        for (const subItem of item.items) {
            results.push(...getIIIFItems(subItem, type));
        }
    }
    return results;
}

/*
    * Serach for a specific Keyword in an object
    * @param item The item to search in
    * @param type The type of item to search for
    * @returns All items of the specified type found in the object
*/

export function findItemInObject(item: any, type: string): any {
    if (item.type === type) {
        return item;
    }
    if (item.items) {
        for (const subItem of item.items) {
            const result = findItemInObject(subItem, type);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

