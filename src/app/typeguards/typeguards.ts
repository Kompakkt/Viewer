import { ICompilation, IEntity } from '../interfaces/interfaces';

export const isEntity = (obj: any): obj is IEntity => {
  return (
    obj !== undefined &&
    obj.mediaType !== undefined &&
    obj.settings !== undefined
  );
};

export const isCompilation = (obj: any): obj is ICompilation => {
  return (
    obj !== undefined && obj.entities !== undefined && obj.name !== undefined
  );
};

export const isEntityForCompilation = (obj: any): obj is IEntity => {
  const _entity = obj as IEntity;
  return (
    _entity &&
    _entity.name !== undefined &&
    _entity.mediaType !== undefined &&
    _entity.online !== undefined &&
    _entity.finished !== undefined
  );
};

export const isDegreeSpectrum = (value: number) => {
  return value >= 0 && value <= 360 ? value : value > 360 ? 360 : 0;
};
