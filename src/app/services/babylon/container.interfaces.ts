import {Sound, AbstractMesh, Analyser, Texture, StandardMaterial, IParticleSystem, Skeleton, AnimationGroup} from 'babylonjs';
import {Slider} from 'babylonjs-gui';

export interface IAudioContainer {
  audio: Sound;
  currentTime: number;
  slider: Slider;
  plane?: AbstractMesh;
  analyser?: Analyser;
}

export interface IVideoContainer {
  video: HTMLVideoElement;
  currentTime: number;
  slider: Slider;
  plane?: AbstractMesh;
}

export interface IImageContainer {
  image: Texture;
  plane?: AbstractMesh;
  material?: StandardMaterial;
}

export interface I3DModelContainer {
  meshes: AbstractMesh[];
  particleSystems: IParticleSystem[];
  skeletons: Skeleton[];
  animationGroups: AnimationGroup[];
}
