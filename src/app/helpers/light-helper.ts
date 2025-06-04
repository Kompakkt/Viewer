import {
  DirectionalLight,
  HemisphericLight,
  PointLight,
  Scene,
  SpotLight,
  Vector3,
} from '@babylonjs/core';
import { IEntityLight } from 'src/common';

type PartialLightOptions = Partial<IEntityLight> & { type: IEntityLight['type'] };

export const createLight = (
  { type, position: parsedPosition, direction: parsedDirection, intensity }: PartialLightOptions,
  scene: Scene,
) => {
  const position = new Vector3(
    parsedPosition?.x ?? 0,
    parsedPosition?.y ?? 0,
    parsedPosition?.z ?? 0,
  );
  const direction = new Vector3(
    parsedDirection?.x ?? 0,
    parsedDirection?.y ?? 1,
    parsedDirection?.z ?? 0,
  );
  const name = `${type}_${Math.random().toString(36).substring(2, 15)}`;
  const light = (() => {
    switch (type) {
      case 'PointLight': {
        return new PointLight(name, position, scene);
      }
      case 'DirectionalLight': {
        return new DirectionalLight(name, direction, scene);
      }
      case 'HemisphericLight': {
        return new HemisphericLight(name, direction, scene);
      }
      case 'SpotLight': {
        return new SpotLight(name, position, direction, Math.PI / 3, 2, scene);
      }
    }
  })();
  light.intensity = intensity ?? 1;
  return light;
};
