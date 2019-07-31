import { Engine, Scene, Vector3 } from 'babylonjs';

import { IAudioContainer, IVideoContainer } from '../container.interfaces';

export const beforeAudioRender = (scene: Scene, audioContainer: IAudioContainer) => {
  if (audioContainer.audio.isPlaying) {
    if (audioContainer.analyser) {
      const fft = audioContainer.analyser.getByteFrequencyData();
      const fftAverage =
        (fft.map(val => Math.abs(val))
          .reduce((acc, val) => acc + val)) / fft.length;
      scene.getMeshesByTags('audioCenter').forEach(mesh => {
        const scale = ((fftAverage / 255) + 0.05);
        mesh.scaling = new Vector3(scale, scale, scale);
      });
    }
    if (Engine.audioEngine.audioContext) {
      audioContainer.currentTime = Engine.audioEngine.audioContext['currentTime'] - audioContainer.currentTime;
      if (audioContainer.slider) {
        audioContainer.slider.value = (audioContainer.slider.value + audioContainer.currentTime);
      }
    }
  }

  const _cam = scene.getCameraByName('arcRotateCamera');
  if (_cam && _cam['radius']) {
    const radius = Math.abs(_cam['radius']);
    const node = scene.getTransformNodeByName('mediaPanel');
    if (node) {
      node.getChildMeshes()
        .forEach(mesh => mesh.scalingDeterminant = radius / 35);
    }
  }
};

export const afterAudioRender = (audioContainer: IAudioContainer) => {
  if (audioContainer.audio && audioContainer.audio.isPlaying) {
    if (Engine.audioEngine.audioContext) {
      audioContainer.currentTime = Engine.audioEngine.audioContext['currentTime'];
    }
  }
};

export const beforeVideoRender = (videoContainer: IVideoContainer) => {
  if (!videoContainer.video.paused) {
    videoContainer.slider.value = videoContainer.video.currentTime;
  }
};
