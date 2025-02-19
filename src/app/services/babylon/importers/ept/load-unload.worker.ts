/// <reference lib="webworker" />

type LoadUnloadWorkerMessage = {
  camera: number[];
} & {
  [key: string]: {
    position: number[];
    distance: number;
  };
};

type LoadUnloadWorkerResponse = {
  [key: string]: 'load' | 'unload';
};

addEventListener('message', event => {
  const message: LoadUnloadWorkerMessage = event.data;
  const cameraPosition = message.camera;
  const keys = Object.keys(message).filter(key => key !== 'camera');

  const response: LoadUnloadWorkerResponse = {};

  postMessage(response);
});
