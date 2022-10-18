import {
  AbstractMesh,
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
  plane?: AbstractMesh;
}

export interface IImageContainer {
  image: Texture;
  plane?: AbstractMesh;
  material?: StandardMaterial;
}

export interface I3DEntityContainer {
  meshes: AbstractMesh[];
  particleSystems: IParticleSystem[];
  skeletons: Skeleton[];
  animationGroups: AnimationGroup[];
}
