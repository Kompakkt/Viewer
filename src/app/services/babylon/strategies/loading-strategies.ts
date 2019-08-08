import {
    ActionManager,
    Analyser,
    Axis,
    Engine,
    ExecuteCodeAction,
    Mesh,
    MeshBuilder,
    Scene,
    SceneLoader,
    SceneLoaderProgressEvent,
    Sound,
    Space,
    StandardMaterial,
    Tags,
    Texture,
    Tools,
    TransformNode,
    Vector3,
    VideoTexture,
} from 'babylonjs';
import {
    AdvancedDynamicTexture,
    Control,
    Slider,
    StackPanel,
    TextBlock,
} from 'babylonjs-gui';

import {
    IAudioContainer,
    IImageContainer,
    IVideoContainer,
} from '../container.interfaces';

const updateLoadingUI = (engine: Engine) => (
    progress: SceneLoaderProgressEvent,
) => {
    if (progress.lengthComputable) {
        engine.loadingUIText = `${(
            (progress.loaded * 100) /
            progress.total
        ).toFixed()}%`;
    }
};

export const load3DEntity = (
    rootUrl: string,
    extension: string,
    scene: Scene,
) => {
    const rootFolder = Tools.GetFolderPath(rootUrl);
    const filename = Tools.GetFilename(rootUrl);

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
            engine.hideLoadingUI();
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

export const loadAudio = (
    rootUrl: string,
    scene: Scene,
    audioContainer: IAudioContainer,
) => {
    const engine = scene.getEngine();
    const filename = Tools.GetFilename(rootUrl);
    return requestFile(rootUrl)
        .then(
            (arrayBuffer): IAudioContainer => {
                const audio = new Sound(`Audio: ${filename}`, arrayBuffer, scene, () =>
                    engine.hideLoadingUI(),
                );
                const { plane, slider } = createAudioScene(audio, scene);
                const analyser = new Analyser(scene);
                Engine.audioEngine['connectToAnalyser'](analyser);
                analyser.FFT_SIZE = 4096;
                analyser.SMOOTHING = 0.9;
                return {
                    ...audioContainer,
                    analyser,
                    audio,
                    plane,
                    slider,
                };
            },
        )
        .catch(e => {
            console.error(e);
            engine.hideLoadingUI();
        });
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
                const [width, height] = [
                    texture.getSize().width,
                    texture.getSize().height,
                ];
                console.log('size of ground', width, height);
                const ground = Mesh.CreateGround(
                    'gnd',
                    width / 10,
                    height / 10,
                    1,
                    scene,
                );
                Tags.AddTagsTo(ground, 'mediaGround');
                ground.rotate(Axis.X, (Math.PI / 180) * -90, Space.WORLD);

                const gndmat = new StandardMaterial('gmat', scene);
                ground.material = gndmat;
                gndmat.diffuseTexture = texture;

                if (isDefault) {
                    ground.billboardMode = Mesh.BILLBOARDMODE_ALL;
                    gndmat.diffuseTexture.hasAlpha = true;
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
            engine.hideLoadingUI();
            return image;
        })
        .catch(e => {
            engine.hideLoadingUI();
            console.error(e);
        });
};

export const loadVideo = (
    rootUrl: string,
    scene: Scene,
    videoContainer: IVideoContainer,
) => {
    const engine = scene.getEngine();
    const filename = Tools.GetFilename(rootUrl);

    // TODO: Reject on videoTexture fails loading?
    return new Promise<IVideoContainer>((resolve, _) => {
        const videoTexture = new VideoTexture(
            `Video: ${filename}`,
            rootUrl,
            scene,
            false,
        );
        videoTexture.onLoadObservable.add(texture => {
            const video = videoTexture.video;
            const [width, height] = [
                texture.getSize().width,
                texture.getSize().height,
            ];
            const ground = Mesh.CreateGround(
                'videoGround',
                width / 10,
                height / 10,
                1,
                scene,
            );
            Tags.AddTagsTo(ground, 'mediaGround');
            ground.rotate(Axis.X, (Math.PI / 180) * -90, Space.WORLD);
            const videoMat = new StandardMaterial('textVid', scene);
            ground.material = videoMat;
            videoMat.diffuseTexture = videoTexture;
            const { plane, slider } = createVideoScene(video, scene);
            const newContainer: IVideoContainer = {
                ...videoContainer,
                plane,
                slider,
                currentTime: 0,
            };
            resolve(newContainer);
            return newContainer;
        });
    })
        .then(resultContainer => {
            engine.hideLoadingUI();
            return resultContainer;
        })
        .catch(e => {
            console.error(e);
            engine.hideLoadingUI();
        });
};

const createAudioScene = (audio: Sound, scene: Scene) => {

    load3DEntity('assets/models/kompakkt.babylon', '.babylon', scene)
        .then(result => {
            if (result) {
                result.meshes.forEach(mesh => {
                    console.log('Audio gefunden');
                    mesh.isPickable = true;

                    mesh.actionManager = new ActionManager(scene);
                    mesh.actionManager.registerAction(
                        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
                            console.log('click');
                            audio.isPlaying ? audio.pause() : audio.play();
                        }),
                    );
                });
            } else {
                throw new Error('No result');
            }
        });
    // create a Center of Transformation
    const CoT = new TransformNode('mediaPanel');
    CoT.position = new Vector3(0, 0, 0);

    const plane = MeshBuilder.CreatePlane(name, { height: 3, width: 20 }, scene);
    // plane2.renderingGroupId = 1;
    // plane2.billboardMode = Mesh.BILLBOARDMODE_ALL;
    // GUI
    const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane);
    const panel = new StackPanel();
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    const buffer = audio.getAudioBuffer();
    console.log('Audio buffer', buffer);

    const header = new TextBlock();
    header.text = buffer
        ? `Length: ${secondsToHms(buffer.duration)}`
        : `Can't read length`;
    header.width = '400px';
    header.height = '150px';
    header.color = 'black';
    panel.addControl(header);

    const slider = new Slider();
    slider.minimum = 0;
    slider.maximum = buffer ? buffer.duration : 0;
    slider.value = 0;
    slider.width = '2000px';
    slider.height = '300px';
    slider.onValueChangedObservable.add(() => {
        header.text = `Current time: ${secondsToHms(slider.value)}`;
    });
    slider.onPointerDownObservable.add(() => {
        if (audio.isPlaying) {
            audio.stop();
        }
    });
    slider.onPointerUpObservable.add(() => {
        audio.play(0, slider.value);
    });

    panel.addControl(slider);

    // Volume
    const plane3 = MeshBuilder.CreatePlane(name, { height: 15, width: 2 }, scene);
    plane3.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane3.renderingGroupId = 1;
    plane3.parent = CoT;

    const advancedTextureVol = AdvancedDynamicTexture.CreateForMesh(plane3);

    const sliderVol = new Slider();
    sliderVol.isVertical = true;
    sliderVol.minimum = 0;
    sliderVol.maximum = 1;
    sliderVol.value = audio.getVolume();
    sliderVol.height = '1000px';
    sliderVol.width = '150px';
    sliderVol.onValueChangedObservable.add(() => {
        audio.setVolume(sliderVol.value);
    });
    advancedTextureVol.addControl(sliderVol);

    // Cube
    /*
    SceneLoader.ImportMeshAsync(
      null,
      'assets/models/',
      'kompakkt.babylon',
      scene,
      null,
    ).then(result => {
      console.log(result);
      const center = MeshBuilder.CreateBox('audioCenter', { size: 1 }, scene);
      Tags.AddTagsTo(center, 'audioCenter');
      center.isVisible = false;

      const [axisX, axisY] = [Axis['X'], Axis['Y']];

      if (!center.rotationQuaternion) {
        center.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
      }

      const rotationQuaternionX = Quaternion.RotationAxis(
        axisX,
        (Math.PI / 180) * 1,
      );
      let end = rotationQuaternionX.multiply(center.rotationQuaternion);

      const rotationQuaternionY = Quaternion.RotationAxis(
        axisY,
        (Math.PI / 180) * 240,
      );
      end = rotationQuaternionY.multiply(end);

      center.rotationQuaternion = end;

      center.scaling = new Vector3(0.05, 0.05, 0.05);

      result.meshes.forEach(mesh => {
        console.log('Audio gefunden');
        mesh.parent = center;
        mesh.isPickable = true;

        mesh.actionManager = new ActionManager(scene);
        mesh.actionManager.registerAction(
          new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            console.log('click');
            audio.isPlaying ? audio.pause() : audio.play();
          }),
        );
      });
    });*/
    return { plane, slider };
};

const createVideoScene = (video: HTMLVideoElement, scene: Scene) => {
    // create a Center of Transformation
    const CoT = new TransformNode('mediaPanel');
    CoT.position = new Vector3(0, 0, 0);

    const ground = scene.getMeshesByTags('mediaGround')[0];
    ground.computeWorldMatrix(true);
    const bi = ground.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;
    const initialSize = maximum.subtract(minimum);

    ground.isPickable = true;

    ground.actionManager = new ActionManager(scene);
    ground.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            console.log('click');
            video.paused ? video.play() : video.pause();
        }),
    );

    // PLANE for Annotations
    const plane = MeshBuilder.CreatePlane(
        name,
        { height: initialSize.y * 0.1, width: initialSize.x },
        scene,
    );
    Tags.AddTagsTo(plane, 'controller');
    plane.renderingGroupId = 1;
    plane.material = new StandardMaterial('controlMat', scene);
    plane.material.alpha = 1;
    plane.parent = CoT;
    plane.position.y =
        minimum.y - (initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15);

    // Plane for Time-Slider
    const plane2 = MeshBuilder.CreatePlane(
        name,
        {
            height: initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15,
            width: initialSize.x,
        },
        scene,
    );
    plane2.renderingGroupId = 1;
    plane2.parent = CoT;
    plane2.position.y =
        minimum.y -
        (initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15) +
        (initialSize.y * 0.2 > 30 ? initialSize.y * 0.2 : 30) * 0.5;

    // GUI
    const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane2);

    const panel = new StackPanel();
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    const header = new TextBlock();
    const duration = video
        ? String(video.duration)
        : 'Can not calculate length in';
    header.text = `Length: ${duration} sec`;
    header.width = '1000px';
    header.height = '700px';
    header.color = 'black';
    panel.addControl(header);

    const slider = new Slider();
    slider.minimum = 0;
    slider.maximum = video ? video.duration : 0;
    slider.value = 0;
    slider.width = '1100px';
    slider.height = '500px';
    slider.onValueChangedObservable.add(() => {
        header.text = `Current time: ${getCurrentTime(video.currentTime)} min.`;
    });
    slider.onPointerDownObservable.add(() => {
        if (!video.paused) {
            video.pause();
        }
    });
    slider.onPointerUpObservable.add(() => {
        video.currentTime = slider.value;
        video.play();
    });
    panel.addControl(slider);

    // Volume

    const plane3 = MeshBuilder.CreatePlane(
        name,
        {
            height: initialSize.y * 0.8,
            width: initialSize.x * 0.1 > 30 ? initialSize.x * 0.1 : 30,
        },
        scene,
    );
    plane3.renderingGroupId = 1;
    plane3.parent = CoT;
    plane3.position.x = maximum.x + initialSize.x * 0.1;

    const advancedTextureVol = AdvancedDynamicTexture.CreateForMesh(plane3);

    const sliderVol = new Slider();
    sliderVol.isVertical = true;
    sliderVol.minimum = 0;
    sliderVol.maximum = 1;
    sliderVol.value = video.volume;
    sliderVol.height = '400px';
    sliderVol.width = '50px';
    sliderVol.onValueChangedObservable.add(() => {
        video.volume = sliderVol.value;
    });
    advancedTextureVol.addControl(sliderVol);

    return { plane, slider };
};

const str_pad_left = (string, pad, length) => {
    return (new Array(length + 1).join(pad) + string).slice(-length);
};

const getCurrentTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time - minutes * 60;

    return `${str_pad_left(minutes, '0', 2)}:${str_pad_left(seconds, '0', 2)}`;
};

const secondsToHms = (sec: string | number) => {
    const d = Number(sec);

    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);

    return `${('0' + h).slice(-2)}:${('0' + m).slice(-2)}:${('0' + s).slice(-2)}`;
};
