import {
  Mesh,
  Analyser,
  AnimationGroup,
  IParticleSystem,
  Skeleton,
  Sound,
  StandardMaterial,
  Texture,
} from '@babylonjs/core';

export interface IAudioContainer {
  audio: Sound;
  analyser?: Analyser;
}

export interface IVideoContainer {
  video: HTMLVideoElement;
  plane: Mesh;
}

export interface IImageContainer {
  image: Texture;
  plane: Mesh;
  material?: StandardMaterial;
}

export interface I3DEntityContainer {
  meshes: Mesh[];
  particleSystems: IParticleSystem[];
  skeletons: Skeleton[];
  animationGroups: AnimationGroup[];
}
