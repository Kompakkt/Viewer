import { Engine, Scene, Vector3 } from 'babylonjs';

import { IAudioContainer, IVideoContainer } from '../container.interfaces';

export const beforeAudioRender = (
  scene: Scene,
  audioContainer: IAudioContainer,
) => {
  if (audioContainer.audio.isPlaying) {
    if (audioContainer.analyser) {
      const fft = audioContainer.analyser.getByteFrequencyData();
      const fftAverage =
        fft.map(val => Math.abs(val)).reduce((acc, val) => acc + val) /
        fft.length;
      scene.getMeshesByTags('audioCenter').forEach(mesh => {
        const scale = fftAverage / 255 + 0.7;
        mesh.scaling = new Vector3(scale, scale, scale);
      });
    }
    if (Engine.audioEngine.audioContext) {
      audioContainer.currentTime =
        Engine.audioEngine.audioContext['currentTime'] -
        audioContainer.currentTime;
      if (audioContainer.timeSlider) {
        audioContainer.timeSlider.value =
          audioContainer.timeSlider.value + audioContainer.currentTime;
      }
    }
  }
};

export const afterAudioRender = (audioContainer: IAudioContainer) => {
  if (audioContainer.audio && audioContainer.audio.isPlaying) {
    if (Engine.audioEngine.audioContext) {
      audioContainer.currentTime =
        Engine.audioEngine.audioContext['currentTime'];
    }
  }
};

export const beforeVideoRender = (
  // scene: Scene,
  videoContainer: IVideoContainer,
) => {
  if (!videoContainer.video.paused) {
    videoContainer.timeSlider.value = videoContainer.video.currentTime;
  }
};
