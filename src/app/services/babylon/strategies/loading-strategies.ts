import {
  AbstractMesh,
  ActionManager,
  Analyser,
  Engine,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  ISceneLoaderProgressEvent,
  PBRMaterial,
  Sound,
  StandardMaterial,
  Material,
  Tags,
  Texture,
  Tools,
  Vector3,
  VideoTexture,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Control, Slider, StackPanel, TextBlock } from '@babylonjs/gui';
import '@babylonjs/loaders';

import {
  I3DEntityContainer,
  IAudioContainer,
  IImageContainer,
  IVideoContainer,
} from '../container.interfaces';

const updateLoadingUI = (engine: Engine) => (progress: ISceneLoaderProgressEvent) => {
  if (progress.lengthComputable) {
    engine.loadingUIText = `${((progress.loaded * 100) / progress.total).toFixed()}%`;
  }
};

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

export const load3DEntity = (rootUrl: string, scene: Scene) => {
  const rootFolder = Tools.GetFolderPath(rootUrl);
  const filename = Tools.GetFilename(rootUrl);
  const extension = filename.includes('.') ? `.${filename.split('.').slice(-1).pop()!}` : undefined;

  const engine = scene.getEngine();

  return SceneLoader.ImportMeshAsync(
    null,
    rootFolder,
    filename,
    scene,
    updateLoadingUI(engine),
    extension,
  )
    .then(result => {
      console.log(result);
      result.meshes.forEach(mesh => patchMeshPBR(mesh, scene));
      return result;
    })
    .catch(e => {
      console.error(e);
      engine.hideLoadingUI();
    });
};

const requestFile = (url: string) => {
  return fetch(url)
    .then(response => response.arrayBuffer())
    .catch(e => console.error(e));
};

export const loadImage = (
  rootUrl: string,
  scene: Scene,
  imageContainer: IImageContainer,
  isDefault?: boolean,
) => {
  const engine = scene.getEngine();
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
          ...imageContainer,
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
  })
    .then(image => {
      return image;
    })
    .catch(e => {
      engine.hideLoadingUI();
      console.error(e);
    });
};

export const loadVideo = (rootUrl: string, scene: Scene, videoContainer: IVideoContainer) => {
  const engine = scene.getEngine();
  const filename = Tools.GetFilename(rootUrl);

  // TODO: Reject on videoTexture fails loading?
  return new Promise<IVideoContainer>((resolve, _) => {
    const videoTexture = new VideoTexture(`Video: ${filename}`, rootUrl, scene, false);
    videoTexture.onLoadObservable.add(texture => {
      const video = videoTexture.video;
      const { plane, timeSlider } = createVideoScene(videoTexture, texture, scene);
      const newContainer: IVideoContainer = {
        ...videoContainer,
        video,
        currentTime: 0,
        timeSlider,
        plane,
      };
      resolve(newContainer);
      return newContainer;
    });
  })
    .then(resultContainer => {
      return resultContainer;
    })
    .catch(e => {
      console.error(e);
      engine.hideLoadingUI();
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
    new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      video.paused ? video.play() : video.pause();
    }),
  );

  // Create mediaControls
  const timeSlider = createMediaControls(_width, _height, scene, video, undefined);
  const plane = groundVideo;
  return { plane, timeSlider };
};

export const loadAudio = (
  rootUrl: string,
  scene: Scene,
  audioContainer: IAudioContainer,
  cubeMeshes: I3DEntityContainer,
) => {
  const engine = scene.getEngine();
  const filename = Tools.GetFilename(rootUrl);
  return requestFile(rootUrl)
    .then(async (arrayBuffer): Promise<IAudioContainer> => {
      const audio = await new Promise<Sound>((resolve, _) => {
        const sound = new Sound(`Audio: ${filename}`, arrayBuffer, scene, () => {
          resolveSound();
        });
        const resolveSound = () => resolve(sound);
      });

      const { timeSlider, analyser } = createAudioScene(audio, scene, cubeMeshes);
      return {
        ...audioContainer,
        audio,
        currentTime: 0,
        timeSlider,
        analyser,
      };
    })
    .catch(e => {
      console.error(e);
      engine.hideLoadingUI();
    });
};

const createAudioScene = (audio: Sound, scene: Scene, cubeMeshes: I3DEntityContainer) => {
  // audio analyser
  const analyser = new Analyser(scene);
  // TODO: AudioEngine implements IAudioEngine
  (Engine.audioEngine as any).connectToAnalyser(analyser);
  analyser.FFT_SIZE = 4096;
  analyser.SMOOTHING = 0.9;

  // Create mediaControls
  const timeSlider = createMediaControls(30, 20, scene, undefined, audio);

  // Click on cube -> start/ stop sound
  cubeMeshes.meshes.forEach(mesh => {
    Tags.AddTagsTo(mesh, 'audioCenter');
    mesh.isPickable = true;
    mesh.actionManager = new ActionManager(scene);
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        console.log('click');
        audio.isPlaying ? audio.stop() : audio.play(0, timeSlider.value);
      }),
    );
  });

  return { timeSlider, analyser };
};

const createMediaControls = (
  _width: number,
  _height: number,
  scene: Scene,
  video?: HTMLVideoElement,
  audio?: Sound,
) => {
  // time slider
  const plane = MeshBuilder.CreatePlane('timeSlider', { height: _height, width: _width }, scene);
  plane.position = new Vector3(video ? 0 : 10, -_height * 0.6, 0);
  plane.renderingGroupId = 2;
  const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane);

  let duration = 0;
  if (audio) {
    const buffer = audio.getAudioBuffer();
    if (buffer) {
      duration = buffer.duration;
    }
  }
  if (video) {
    duration = video.duration;
  }

  const timeSlider = new Slider();
  timeSlider.minimum = 0;
  timeSlider.maximum = duration;
  timeSlider.value = 0;
  timeSlider.height = '100px';
  timeSlider.width = '1100px';
  timeSlider.onPointerDownObservable.add(() => {
    if (audio && audio.isPlaying) {
      audio.stop();
    }
    if (video && !video.paused) {
      video.pause();
    }
  });
  timeSlider.onPointerUpObservable.add(() => {
    if (audio) {
      audio.play(0, timeSlider.value);
    }
    if (video) {
      video.currentTime = timeSlider.value;
      video.play();
    }
  });

  const panel = new StackPanel();
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  advancedTexture.addControl(panel);

  const header = new TextBlock();
  header.text = `Length: ${secondsToHms(duration)} sec`;
  header.width = '200px';
  header.height = '70px';
  header.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  header.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  header.color = 'black';
  panel.addControl(header);

  timeSlider.onValueChangedObservable.add(() => {
    header.text = `Current time: ${
      audio ? secondsToHms(timeSlider.value) : getCurrentTime(video?.currentTime ?? 0)
    }`;
  });
  panel.addControl(timeSlider);

  // Volume
  const planeVol = MeshBuilder.CreatePlane(
    'volumeSlider',
    { height: _height, width: _width * 0.5 },
    scene,
  );
  planeVol.position = new Vector3(_width * 0.6 + (video ? +0 : +10), 0, 0);
  planeVol.renderingGroupId = 2;

  const advancedTextureVol = AdvancedDynamicTexture.CreateForMesh(planeVol);

  const sliderVol = new Slider();
  sliderVol.minimum = 0;
  sliderVol.maximum = 1;
  sliderVol.value = audio ? audio.getVolume() : video?.volume ?? 0;
  sliderVol.isVertical = true;
  sliderVol.height = '500px';
  sliderVol.width = '45px';
  sliderVol.onValueChangedObservable.add(() => {
    if (audio) {
      audio.setVolume(sliderVol.value);
    } else if (video) {
      video.volume = sliderVol.value;
    }
  });

  advancedTextureVol.addControl(sliderVol);

  return timeSlider;
};

const padDigits = (value: number) => value.toString().padStart(2, '0');

const getCurrentTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = time - minutes * 60;

  return `${padDigits(minutes)}:${padDigits(seconds)}`;
};

const secondsToHms = (sec: string | number) => {
  const d = Number(sec);

  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor((d % 3600) % 60);

  // tslint:disable-next-line:prefer-template
  return `${('0' + h).slice(-2)}:${('0' + m).slice(-2)}:${('0' + s).slice(-2)}`;
};
