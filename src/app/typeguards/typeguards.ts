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

export const isEntityForCollection = (obj: any): obj is IEntity => {
  const _entity = obj as IEntity;
  return (
      _entity &&
      _entity.name !== undefined &&
      _entity.mediaType !== undefined &&
      _entity.online !== undefined &&
      _entity.finished !== undefined
  );
};
