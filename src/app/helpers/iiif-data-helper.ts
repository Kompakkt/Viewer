import { IAgent, IAnnotation } from '~common/interfaces';

export type IIIFData = {
    annotations: IIIFAnnotation[];
}

export type IIIFAnnotation = {
    id: number; normal: number[]; position: number[]; value: string;
}

export const isIIIFAnnotation = (annotation: any): annotation is IIIFAnnotation => {
    return 'id' in annotation && 'normal' in annotation && 'position' in annotation && 'value' in annotation;
};

export const isIIIFData = (data: any): data is IIIFData => {
    return 'annotations' in data && Array.isArray(data.annotations) && data.annotations.every(isIIIFAnnotation);
};

export const convertIIIFAnnotation = ({ id, normal, position, value }: IIIFAnnotation, ranking: number): IAnnotation => {
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
                    position: {
                        x: position[0] * normal[0] * 3,
                        y: position[1] * normal[1] * 3,
                        z: position[2] * normal[2] * 3,
                    },
                    target: {
                        x: position[0],
                        y: position[1],
                        z: position[2],
                    },
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
                referencePoint: {
                    x: position[0],
                    y: position[1],
                    z: position[2],
                },
                referenceNormal: {
                    x: normal[0],
                    y: normal[1],
                    z: normal[2],
                },
            },
        },
    } as IAnnotation;
};
