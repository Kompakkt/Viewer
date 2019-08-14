import {
    ActionManager,
    Analyser,
    Engine,
    ExecuteCodeAction,
    Mesh,
    MeshBuilder,
    Scene,
    SceneLoader,
    SceneLoaderProgressEvent,
    Sound,
    StandardMaterial,
    Tags,
    Texture,
    Tools,
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
    I3DEntityContainer,
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
                const [_width, _height] = [
                    texture.getSize().width,
                    texture.getSize().height,
                ];
                const ground = MeshBuilder
                    .CreatePlane('gnd',
                                 { height: _height, width: _width }, scene);
                Tags.AddTagsTo(ground, 'mediaGround');
                const gndmat = new StandardMaterial('gmat', scene);
                ground.material = gndmat;
                gndmat.diffuseTexture = texture;

                if (isDefault) {
                    ground.billboardMode = Mesh.BILLBOARDMODE_ALL;
                    gndmat.diffuseTexture.hasAlpha = true;
                    ground.renderingGroupId = 0;
                    ground.scaling = new Vector3(0.09, 0.09, 0.09);
                    ground.position.y = 1;
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
            engine.hideLoadingUI();
            return resultContainer;
        })
        .catch(e => {
            console.error(e);
            engine.hideLoadingUI();
        });
};

const createVideoScene = (videoTexture: VideoTexture, texture, scene: Scene) => {

    // video as texture on mesh
    const video = videoTexture.video;
    const [_width, _height] = [texture.getSize().width * 0.05, texture.getSize().height * 0.05];
    const groundVideo = MeshBuilder.CreatePlane('videoGround',
                                                { height: _height, width: _width }, scene);
    Tags.AddTagsTo(groundVideo, 'mediaGround');
    const videoMat = new StandardMaterial('textVid', scene);
    groundVideo.material = videoMat;
    videoMat.diffuseTexture = videoTexture;

    // Click on plane -> start/ stop sound
    groundVideo.isPickable = true;
    groundVideo.actionManager = new ActionManager(scene);
    groundVideo.renderingGroupId = 3;
    groundVideo.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            video.paused ? video.play() : video.pause();
            console.log('KLICK'); }));

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
                    const sound = new Sound(`Audio: ${filename}`, arrayBuffer, scene,
                                            () => {
                    engine.hideLoadingUI();
                    resolveSound();
            },
            );
                    const resolveSound = () => resolve (sound);
                });

                const { timeSlider, analyser } = createAudioScene(audio, scene, cubeMeshes);
                return {
                    ...audioContainer,
                    audio,
                    currentTime: 0,
                    timeSlider,
                    analyser,
                };
            },
        )
        .catch(e => {
            console.error(e);
            engine.hideLoadingUI();
        });
};

const createAudioScene = (audio: Sound, scene: Scene, cubeMeshes: I3DEntityContainer) => {

    // audio analyser
    const analyser = new Analyser(scene);
    Engine.audioEngine['connectToAnalyser'](analyser);
    analyser.FFT_SIZE = 4096;
    analyser.SMOOTHING = 0.9;

    // Create mediaControls
    const timeSlider = createMediaControls(30, 20, scene, undefined, audio);

    // Click on cube -> start/ stop sound
    const center = MeshBuilder.CreateBox('audioCenter', { size: 1 }, scene);
    Tags.AddTagsTo(center, 'audioCenter');
    center.isVisible = false;
    cubeMeshes.meshes.forEach(mesh => {
        mesh.parent = center;
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

const createMediaControls = (_width: number, _height: number,
                             scene: Scene, video?, audio?: Sound) => {

    // time slider
    const plane = MeshBuilder
        .CreatePlane('timeSlider',
                     { height: _height, width: _width }, scene);
    plane.position = new Vector3(0, - _height * 0.6, 0);
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
        }});

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
        header.text = `Current time: ${audio ? secondsToHms(timeSlider.value) :
            getCurrentTime(video.currentTime)}`;
    });
    panel.addControl(timeSlider);

    // Volume
    const planeVol = MeshBuilder.CreatePlane(
        'volumeSlider',
        { height: _height,
          width: _width * 0.5},
        scene);
    planeVol.position = new Vector3(_width * 0.6, 0, 0);
    planeVol.renderingGroupId = 2;

    const advancedTextureVol = AdvancedDynamicTexture.CreateForMesh(planeVol);

    const sliderVol = new Slider();
    sliderVol.minimum = 0;
    sliderVol.maximum = 1;
    sliderVol.value = audio ? audio.getVolume() :  video.volume;
    sliderVol.isVertical = true;
    sliderVol.height = '500px';
    sliderVol.width = '45px';
    sliderVol.onValueChangedObservable.add(() => {
        audio ? audio.setVolume(sliderVol.value) : video.volume = sliderVol.value;
    });

    advancedTextureVol.addControl(sliderVol);

    return timeSlider;
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

    // tslint:disable-next-line:prefer-template
    return `${('0' + h).slice(-2)}:${('0' + m).slice(-2)}:${('0' + s).slice(-2)}`;
};
