import {
  EXRCubeTexture,
  EnvironmentTextureTools,
  HDRCubeTexture,
  type Scene,
} from '@babylonjs/core';

const CONVERSION_CUBEMAP_SIZE = 128;

export const SKYBOX_FILE_EXTENSIONS = ['.env', '.hdr', '.exr'] as const;
export const SKYBOX_MAX_FILE_SIZE = 50 * 1024 * 1024;

const getSkyboxFileExtension = (fileName: string) =>
  SKYBOX_FILE_EXTENSIONS.find(extension => fileName.toLowerCase().endsWith(extension));

const readAsBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected data URL result'));
        return;
      }
      const base64 = result.split(',')[1] ?? '';
      if (!base64) {
        reject(new Error('Unexpected data URL result'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed reading the skybox file'));
    reader.readAsDataURL(blob);
  });

const convertSkyboxToEnv = async (file: File, scene: Scene) => {
  const url = URL.createObjectURL(file);
  try {
    const texture = await new Promise<HDRCubeTexture | EXRCubeTexture>((resolve, reject) => {
      let loaded: HDRCubeTexture | EXRCubeTexture | undefined;
      const onSuccess = () => {
        if (loaded) resolve(loaded);
      };
      const onError = (message?: string, exception?: unknown) =>
        reject(
          new Error(
            message ??
              (exception instanceof Error ? exception.message : 'Failed to load skybox file'),
          ),
        );

      if (file.name.toLowerCase().endsWith('.hdr')) {
        loaded = new HDRCubeTexture(
          url,
          scene,
          CONVERSION_CUBEMAP_SIZE,
          false,
          true,
          false,
          true,
          onSuccess,
          onError,
        );
      } else {
        loaded = new EXRCubeTexture(
          url,
          scene,
          CONVERSION_CUBEMAP_SIZE,
          false,
          true,
          false,
          true,
          onSuccess,
          onError,
        );
      }
    });

    const env = await EnvironmentTextureTools.CreateEnvTextureAsync(texture);
    texture.dispose();
    if (!env?.byteLength) throw new Error('Failed to convert skybox file to environment texture');
    return env;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const prepareSkyboxForUpload = async (file: File, scene: Scene) => {
  if (getSkyboxFileExtension(file.name) === undefined)
    throw new Error('Not a valid skybox file: expected .env, .hdr or .exr');
  if (file.size > SKYBOX_MAX_FILE_SIZE)
    throw new Error('Skybox file too large: maximum size is 50 MB');
  if (!scene.getEngine().getCaps().textureHalfFloatRender)
    throw new Error('Your browser does not support skybox uploads (no HDR rendering capability)');

  if (file.name.toLowerCase().endsWith('.env')) {
    const buffer = await file.arrayBuffer();
    if (!EnvironmentTextureTools.GetEnvInfo(new Uint8Array(buffer)))
      throw new Error('Not a valid skybox file: expected a Babylon environment texture');
    return buffer;
  }

  return convertSkyboxToEnv(file, scene);
};

export const skyboxToBase64 = (env: ArrayBuffer) => readAsBase64(new Blob([env]));
