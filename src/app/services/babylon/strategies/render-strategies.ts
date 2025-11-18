import { Scene, Vector3 } from '@babylonjs/core';

import { IAudioContainer } from '../container.interfaces';

export const beforeAudioRender = (scene: Scene, audioContainer: IAudioContainer) => {
  if (audioContainer.audio.isPlaying) {
    if (audioContainer.analyser) {
      const fft = audioContainer.analyser.getByteFrequencyData();
      const fftAverage = fft.map(val => Math.abs(val)).reduce((acc, val) => acc + val) / fft.length;
      scene.getMeshesByTags('audioCenter').forEach(mesh => {
        const scale = fftAverage / 255 + 0.7;
        mesh.scaling = new Vector3(scale, scale, scale);
      });
    }
  }
};
