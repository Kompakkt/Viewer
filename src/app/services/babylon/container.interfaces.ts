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
import { Slider } from '@babylonjs/gui';

export interface IAudioContainer {
  audio: Sound;
  currentTime: number;
  timeSlider: Slider;
  analyser?: Analyser;
}

export interface IVideoContainer {
  video: HTMLVideoElement;
  currentTime: number;
  timeSlider: Slider;
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
