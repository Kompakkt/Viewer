import {
  AbstractMesh,
  ActionManager,
  Analyser,
  Engine,
  ExecuteCodeAction,
  ImportMeshAsync,
  ISceneLoaderProgressEvent,
  Material,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Sound,
  StandardMaterial,
  Tags,
  Texture,
  Tools,
  Vector3,
  VideoTexture,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { IAudioContainer, IImageContainer, IVideoContainer } from '../container.interfaces';

let counter = 0;
const createOrClonePBRMaterial = (
  scene: Scene,
  material?: PBRMaterial | StandardMaterial | Material,
) => {
  const name = material ? `${material.name}_pbr` : `pbr${++counter}`;
  const mat = new PBRMaterial(name, scene);

  mat.roughness = 0.75;
  mat.metallic = 0;
  if (material instanceof PBRMaterial) {
    const { roughness, metallic } = material;
    if (roughness) mat.roughness = roughness;
    if (metallic) mat.metallic = metallic;
  }

  return mat;
};

const patchMeshPBR = (mesh: AbstractMesh, scene: Scene) => {
  const material = mesh.material as StandardMaterial | PBRMaterial | null;
  if (material instanceof PBRMaterial) {
    console.log('Material is PBRMaterial. Skipping...');
  } else if (material instanceof StandardMaterial) {
    console.log('Material is StandardMaterial. Patching to PBRMaterial');
    const pbrMaterial = createOrClonePBRMaterial(scene, material);

    // Diffuse / Albedo
    pbrMaterial.albedoTexture = material.diffuseTexture ?? pbrMaterial.albedoTexture;
    pbrMaterial.albedoColor = material.diffuseColor ?? pbrMaterial.albedoColor;

    // Bump
    const bump = material.bumpTexture;
    if (bump) {
      pbrMaterial.bumpTexture = bump;
      pbrMaterial.bumpTexture.level = 1.5;
    }

    // Emissive
    pbrMaterial.emissiveColor = material.emissiveColor;
    pbrMaterial.emissiveTexture = material.emissiveTexture ?? pbrMaterial.emissiveTexture;

    // Transparency
    pbrMaterial.transparencyMode = material.transparencyMode ?? 0;

    mesh.material = pbrMaterial;
  } else {
    console.log('No Material. Creating default Material');
    const pbrMaterial = createOrClonePBRMaterial(scene);
    mesh.material = pbrMaterial;
  }
};

export const loadPointCloud = async (
  rootUrl: string,
  scene: Scene,
  onProgress?: (progress: ISceneLoaderProgressEvent) => void,
) => {
  const filename = Tools.GetFilename(rootUrl);
  const pluginExtension = filename.includes('.')
    ? `.${filename.split('.').slice(-1).pop()!}`
    : undefined;

  // TODO: Currently, point clouds do not have a mesh for mesh settings. Using the root node somehow breaks the scene.
  return ImportMeshAsync(rootUrl, scene, { onProgress, pluginExtension });
};

export const loadSplat = async (
  rootUrl: string,
  scene: Scene,
  onProgress?: (progress: ISceneLoaderProgressEvent) => void,
) => {
  return ImportMeshAsync(rootUrl, scene, { onProgress });
};

export const load3DEntity = async (
  rootUrl: string,
  scene: Scene,
  isDefault: boolean | undefined,
  onProgress?: (progress: ISceneLoaderProgressEvent) => void,
) => {
  const filename = Tools.GetFilename(rootUrl);
  const extension = filename.includes('.') ? `.${filename.split('.').slice(-1).pop()!}` : undefined;

  console.log('load3Dentity', rootUrl, filename, extension);

  return ImportMeshAsync(rootUrl, scene, {
    pluginExtension: extension,
    onProgress,
  }).then(result => {
    console.log(result);
    if (isDefault) {
      // Ignore environment lighting
      result.meshes.forEach(mesh => {
        if (!mesh.material) return;
        const material = mesh.material as PBRMaterial;
        material.environmentIntensity = 0;
      });
      // Disable Tone-Mapping
      scene.imageProcessingConfiguration.toneMappingEnabled = false;
    }
    result.meshes.forEach(mesh => {
      patchMeshPBR(mesh, scene);
      mesh.renderingGroupId = 1;
    });
    return result;
  });
};

export const loadImage = async (rootUrl: string, scene: Scene, isDefault?: boolean) => {
  return new Promise<IImageContainer>((resolve, reject) => {
    const texture = new Texture(
      rootUrl,
      scene,
      false,
      true,
      undefined,
      () => {
        const [_width, _height] = [texture.getSize().width, texture.getSize().height];
        const ground = MeshBuilder.CreatePlane(
          'gnd',
          {
            height: _height * (isDefault ? 1 : 0.05),
            width: _width * (isDefault ? 1 : 0.05),
          },
          scene,
        );
        Tags.AddTagsTo(ground, 'mediaGround');
        const gndmat = new StandardMaterial('gmat', scene);
        ground.material = gndmat;
        gndmat.diffuseTexture = texture;
        gndmat.diffuseTexture.hasAlpha = true;

        if (isDefault) {
          ground.billboardMode = Mesh.BILLBOARDMODE_ALL;
          ground.renderingGroupId = 0;
          ground.scaling = new Vector3(0.09, 0.09, 0.09);
          ground.position.y = 6.4;
          ground.position.x = 9;
          ground.position.z = 6.4;
        }

        const newImageContainer: IImageContainer = {
          image: texture,
          material: gndmat,
          plane: ground,
        };
        resolve(newImageContainer);
        return;
      },
      err => {
        reject(err);
      },
    );
  }).then(image => {
    return image;
  });
};

export const loadVideo = async (rootUrl: string, scene: Scene) => {
  const filename = Tools.GetFilename(rootUrl);

  // TODO: Reject on videoTexture fails loading?
  return new Promise<IVideoContainer>((resolve, _) => {
    const videoTexture = new VideoTexture(`Video: ${filename}`, rootUrl, scene, false);
    videoTexture.onLoadObservable.add(texture => {
      const video = videoTexture.video;
      const { plane } = createVideoScene(videoTexture, texture, scene);
      const newContainer: IVideoContainer = { video, plane };
      resolve(newContainer);
      return newContainer;
    });
  }).then(resultContainer => {
    return resultContainer;
  });
};

const createVideoScene = (videoTexture: VideoTexture, texture: Texture, scene: Scene) => {
  // video as texture on mesh
  const video = videoTexture.video;
  const [_width, _height] = [texture.getSize().width * 0.05, texture.getSize().height * 0.05];
  const groundVideo = MeshBuilder.CreatePlane(
    'videoGround',
    { height: _height, width: _width },
    scene,
  );
  Tags.AddTagsTo(groundVideo, 'mediaGround');
  Tags.AddTagsTo(groundVideo, 'videoPlane');
  const videoMat = new StandardMaterial('textVid', scene);

  groundVideo.material = videoMat;
  videoMat.diffuseTexture = videoTexture;

  // Click on plane -> start/ stop sound
  groundVideo.isPickable = true;
  groundVideo.actionManager = new ActionManager(scene);
  groundVideo.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, () =>
      video.paused ? video.play() : video.pause(),
    ),
  );

  // Create mediaControls
  const plane = groundVideo;
  return { plane };
};

export const loadAudio = async (rootUrl: string, scene: Scene, meshes: AbstractMesh[]) => {
  const filename = Tools.GetFilename(rootUrl);
  return fetch(rootUrl)
    .then(response => response.arrayBuffer())
    .then(async (arrayBuffer): Promise<IAudioContainer> => {
      const audio = await new Promise<Sound>((resolve, _) => {
        const sound = new Sound(`Audio: ${filename}`, arrayBuffer, scene, () => {
          resolveSound();
        });
        const resolveSound = () => resolve(sound);
      });

      const { analyser } = createAudioScene(audio, scene, meshes);
      return { audio, analyser };
    });
};

const createAudioScene = (audio: Sound, scene: Scene, meshes: AbstractMesh[]) => {
  // audio analyser
  const analyser = new Analyser(scene);
  // TODO: AudioEngine implements IAudioEngine
  (Engine.audioEngine as any).connectToAnalyser(analyser);
  analyser.FFT_SIZE = 4096;
  analyser.SMOOTHING = 0.9;

  // Click on cube -> start/ stop sound
  meshes.forEach(mesh => {
    Tags.AddTagsTo(mesh, 'audioCenter');
    mesh.isPickable = true;
  });

  return { analyser };
};
