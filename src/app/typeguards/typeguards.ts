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
