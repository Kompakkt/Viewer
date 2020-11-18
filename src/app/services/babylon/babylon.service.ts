/* tslint:disable:max-line-length */
import { DOCUMENT } from '@angular/common';
import {
  ComponentFactoryResolver,
  Inject,
  Injectable,
  Injector,
  ViewContainerRef,
} from '@angular/core';
import {
  ArcRotateCamera,
  Camera,
  Color4,
  Engine,
  FxaaPostProcess,
  Layer,
  Scene,
  SharpenPostProcess,
  Sound,
  Texture,
  Tools,
  Vector3,
  PostProcess,
} from 'babylonjs';
import { Slider } from 'babylonjs-gui';
// tslint:disable-next-line:no-import-side-effect
import 'babylonjs-loaders';

import { RenderCanvasComponent } from '../../components/render-canvas/render-canvas.component';

import {
  createDefaultCamera,
  getDefaultPosition,
  getDefaultTarget,
  moveCameraToTarget,
  resetCamera,
  setCameraTarget,
  setUpCamera,
  updateDefaults,
} from './camera-handler';
import {
  I3DEntityContainer,
  IAudioContainer,
  IImageContainer,
  IVideoContainer,
} from './container.interfaces';
import { LoadingScreen, LoadingscreenhandlerService } from './loadingscreen';
import {
  load3DEntity,
  loadAudio,
  loadImage,
  loadVideo,
} from './strategies/loading-strategies';
import {
  afterAudioRender,
  beforeAudioRender,
  beforeVideoRender,
} from './strategies/render-strategies';

@Injectable({
  providedIn: 'root',
})
export class BabylonService {
  // Create an instance of RenderCanvasComponent
  // and use this for the Engine
  private canvasRef = this.factoryResolver
    .resolveComponentFactory(RenderCanvasComponent)
    .create(this.injector);
  private canvas = this.canvasRef.location.nativeElement
    .childNodes[0] as HTMLCanvasElement;

  private engine: Engine;
  private scene: Scene;

  private effects: PostProcess[] = [];

  public mediaType = '';
  public videoContainer: IVideoContainer;
  public audioContainer: IAudioContainer;
  public imageContainer: IImageContainer;
  public entityContainer: I3DEntityContainer;

  public cameraManager = {
    getActiveCamera: this.getActiveCamera,
    moveActiveCameraToPosition: (positionVector: Vector3) => {
      moveCameraToTarget(this.getActiveCamera(), this.scene, positionVector);
    },
    resetCamera: () => resetCamera(this.getActiveCamera(), this.scene),
    getInitialPosition: () => ({
      cameraType: 'arcRotateCam',
      position: {
        x: this.getActiveCamera().alpha,
        y: this.getActiveCamera().beta,
        z: this.getActiveCamera().radius,
      },
      target: {
        x: this.getActiveCamera().target.x,
        y: this.getActiveCamera().target.y,
        z: this.getActiveCamera().target.z,
      },
    }),
    getDefaultPosition: () => ({
      cameraType: 'arcRotateCam',
      position: getDefaultPosition(),
      target: getDefaultTarget(),
    }),
    setActiveCameraTarget: (targetVector: Vector3) =>
      setCameraTarget(this.getActiveCamera(), targetVector),
    updateDefaults,
    setUpActiveCamera: (maxSize: number) =>
      setUpCamera(this.getActiveCamera(), maxSize, this.mediaType),
  };

  private backgroundURL = 'assets/textures/backgrounds/darkgrey.jpg';
  private backgroundColor: {
    r: number;
    g: number;
    b: number;
    a: number;
  } = { r: 0, g: 0, b: 0, a: 0 };
  private background: Layer | undefined;
  private isBackground: boolean | undefined;

  constructor(
    private loadingScreenHandler: LoadingscreenhandlerService,
    @Inject(DOCUMENT) private document: HTMLDocument,
    private factoryResolver: ComponentFactoryResolver,
    private injector: Injector,
  ) {
    this.canvas.id = 'renderCanvas';
    this.engine = new Engine(this.canvas, true, {
      audioEngine: true,
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.scene = new Scene(this.engine);
    this.scene.createDefaultEnvironment();
    this.engine.loadingScreen = new LoadingScreen(
      this.canvas,
      '#111111',
      'assets/img/kompakkt-icon.png',
      this.loadingScreenHandler,
    );

    // Add default camera
    this.scene.addCamera(createDefaultCamera(this.scene, this.canvas));

    const fxaa = new FxaaPostProcess('fxaa', 1.0, this.getActiveCamera());
    fxaa.samples = 16;

    const sharpen = new SharpenPostProcess(
      'sharpen',
      1.0,
      this.getActiveCamera(),
    );
    sharpen.edgeAmount = 0.25;

    this.effects.push(fxaa, sharpen);
    console.log('Effects applied', this.effects);

    // Initialize empty, otherwise we would need to check against
    // undefined in strict mode
    this.audioContainer = {
      audio: new Sound('', '', this.scene),
      currentTime: 0,
      timeSlider: new Slider(),
    };
    this.videoContainer = {
      video: this.document.createElement('video'),
      timeSlider: new Slider(),
      currentTime: 0,
    };
    this.imageContainer = {
      image: new Texture('', this.scene),
    };
    this.entityContainer = {
      meshes: [],
      particleSystems: [],
      skeletons: [],
      animationGroups: [],
    };

    // Increase mouse precision the closer the camera is to it's target
    // Increased mouse precision = slower zoom
    this.scene.registerBeforeRender(() => {
      const camera = this.getActiveCamera();
      if (!camera) return;

      // Annotation_Marker -- Fixed_Size_On_Zoom
      this.scene.getMeshesByTags(
        'plane',
        mesh => (mesh.scalingDeterminant = camera.radius / 35),
      );
      this.scene.getMeshesByTags(
        'label',
        mesh => (mesh.scalingDeterminant = camera.radius / 35),
      );
    });

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public getScene(): Scene {
    return this.scene;
  }

  public attachCanvas(viewContainerRef: ViewContainerRef) {
    viewContainerRef.insert(this.canvasRef.hostView);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getActiveCamera() {
    if (!this.scene.activeCamera) {
      this.scene.activeCamera = this.scene.cameras[0];
    }
    return this.scene.activeCamera as ArcRotateCamera;
  }

  public resize(): void {
    this.engine.resize();
    this.scene.cameras.forEach(camera =>
      camera.attachControl(this.canvas, false),
    );
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public setBackgroundImage(background: boolean): void {
    if (background && !this.isBackground) {
      this.background = new Layer(
        'background',
        this.backgroundURL,
        this.scene,
        true,
      );
      this.background.alphaBlendingMode = Engine.ALPHA_ADD;
      this.background.isBackground = true;
      this.isBackground = true;
    }
    if (!background && this.background) {
      this.background.dispose();
      this.isBackground = false;
    } else {
      return;
    }
  }

  public setBackgroundColor(color: any): void {
    this.backgroundColor = color;
    this.scene.clearColor = new Color4(
      color.r / 255,
      color.g / 255,
      color.b / 255,
      color.a,
    );
  }

  public getColor(): any {
    return this.backgroundColor;
  }

  public hideMesh(tag: string, visibility: boolean) {
    this.scene.getMeshesByTags(tag, mesh => (mesh.isVisible = visibility));
  }

  private clearScene() {
    // Meshes
    this.scene.meshes.forEach(mesh => mesh.dispose());
    this.scene.meshes = [];
    // Lights
    this.scene.lights.forEach(light => light.dispose());
    this.scene.lights = [];
    // Audio
    this.audioContainer.audio.dispose();
    this.audioContainer.timeSlider.dispose();
    this.audioContainer.currentTime = 0;
    // Video
    this.videoContainer.video.pause();
    this.videoContainer.video.remove();
    this.videoContainer.timeSlider.dispose();
    this.videoContainer.currentTime = 0;
    // Unregister renderers
    const preObservers = this.scene.onBeforeRenderObservable['_observers'];
    const postObservers = this.scene.onAfterRenderObservable['_observers'];
    // The render callbacks have names which we can check
    const unregisterObservers = ['renderAudio', 'renderVideo'];
    for (const observer of preObservers) {
      if (unregisterObservers.includes(observer.callback.name)) {
        this.scene.unregisterBeforeRender(observer.callback);
      }
    }
    for (const observer of postObservers) {
      if (unregisterObservers.includes(observer.callback.name)) {
        this.scene.unregisterAfterRender(observer.callback);
      }
    }
  }

  public loadEntity(
    clearScene: boolean,
    rootUrl: string,
    mediaType = 'model',
    extension = 'babylon',
    isDefault?: boolean,
  ) {
    this.engine.displayLoadingUI();
    this.resize();
    if (clearScene) {
      this.clearScene();
    }
    // TODO: manage mediaType via Observable
    this.mediaType = mediaType;
    switch (mediaType) {
      case 'audio':
        return loadAudio(
          rootUrl,
          this.scene,
          this.audioContainer,
          this.entityContainer,
        ).then(result => {
          if (result) {
            this.audioContainer = result;
            // Define as function so we can unregister by variable name
            let renderAudio = () =>
              beforeAudioRender(this.scene, this.audioContainer);
            this.scene.registerBeforeRender(renderAudio);
            renderAudio = () => afterAudioRender(this.audioContainer);
            this.scene.registerAfterRender(renderAudio);
          } else {
            throw new Error('No audio result');
          }
        });
        break;
      case 'video':
        return loadVideo(rootUrl, this.scene, this.videoContainer).then(
          result => {
            if (result) {
              this.videoContainer = result;
              // Define as function so we can unregister by variable name
              const renderVideo = () => beforeVideoRender(this.videoContainer);
              this.scene.registerBeforeRender(renderVideo);
            } else {
              throw new Error('No video result');
            }
          },
        );
        break;
      case 'image':
        return loadImage(rootUrl, this.scene, this.imageContainer).then(
          result => {
            if (result) {
              this.imageContainer = result;
            } else {
              throw new Error('No video result');
            }
          },
        );
        break;
      case 'entity':
      case 'model':
      default:
        return load3DEntity(rootUrl, extension, this.scene).then(result => {
          if (result) {
            this.entityContainer = result;
            if (isDefault) {
              loadImage(
                'assets/img/logo-background.png',
                this.scene,
                this.imageContainer,
                isDefault,
              ).then(img => {
                if (img) {
                  this.imageContainer = img;
                } else {
                  throw new Error('No result');
                }
              });
            }
          } else {
            throw new Error('No result');
          }
        });
    }
  }

  public async createScreenshot() {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, _) =>
      this.getEngine().onEndFrameObservable.add(resolve),
    );
    const result = await new Promise<string>((resolve, reject) => {
      const _activeCamera = this.getScene().activeCamera;
      if (_activeCamera instanceof Camera) {
        Tools.CreateScreenshotUsingRenderTarget(
          this.getEngine(),
          _activeCamera,
          { precision: 2 },
          async screenshot => {
            await fetch(screenshot)
              .then(res => res.blob())
              .then(blob => Tools.Download(blob, `Kompakkt-${Date.now()}.png`))
              .then(() => resolve(screenshot))
              .catch(e => {
                console.error(e);
                reject(e);
              });
          },
        );
      }
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public async createPreviewScreenshot(): Promise<string> {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);

    const clearColor = this.getScene().clearColor;
    this.getScene().clearColor = new Color4(0, 0, 0, 0);

    await new Promise<any>((resolve, _) => {
      this.getEngine().onEndFrameObservable.add(resolve);
    });
    const result = await new Promise<string>((resolve, _) => {
      const _activeCamera = this.getScene().activeCamera;

      if (_activeCamera instanceof Camera) {
        Tools.CreateScreenshotUsingRenderTarget(
          this.getEngine(),
          _activeCamera,
          { width: 360, height: 225 }, // 16:10
          screenshot => {
            this.getScene().clearColor = clearColor;
            resolve(screenshot);
          },
        );
      }
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);

    return result;
  }
}
