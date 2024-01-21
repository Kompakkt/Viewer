/* tslint:disable:max-line-length */
import { ComponentFactoryResolver, Injectable, Injector, ViewContainerRef } from '@angular/core';
import {
  ArcRotateCamera,
  Camera,
  Color4,
  Engine,
  FxaaPostProcess,
  ImageProcessingConfiguration,
  Layer,
  Mesh,
  PostProcess,
  Scene,
  SharpenPostProcess,
  Tools,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
// tslint:disable-next-line:no-import-side-effect
import '@babylonjs/loaders';
import { BehaviorSubject } from 'rxjs';
import { RenderCanvasComponent } from '../../components/render-canvas/render-canvas.component';
import {
  cameraDefaults$,
  createDefaultCamera,
  createUniversalCamera,
  moveCameraToTarget,
  setCameraTarget,
  setUpCamera,
} from './camera-handler';
import {
  I3DEntityContainer,
  IAudioContainer,
  IImageContainer,
  IVideoContainer,
} from './container.interfaces';
import { load3DEntity, loadAudio, loadImage, loadVideo } from './strategies/loading-strategies';
import {
  afterAudioRender,
  beforeAudioRender,
  beforeVideoRender,
} from './strategies/render-strategies';

type RGBA = { r: number; b: number; g: number; a: number };

@Injectable({
  providedIn: 'root',
})
export class BabylonService {
  // Create an instance of RenderCanvasComponent
  // and use this for the Engine
  private canvasRef = this.factoryResolver
    .resolveComponentFactory(RenderCanvasComponent)
    .create(this.injector);
  private canvas = this.canvasRef.location.nativeElement.childNodes[0] as HTMLCanvasElement;

  private engine: Engine;
  private scene: Scene;
  private effects: PostProcess[] = [];

  public containers = {
    video$: new BehaviorSubject<IVideoContainer | undefined>(undefined),
    audio$: new BehaviorSubject<IAudioContainer | undefined>(undefined),
    image$: new BehaviorSubject<IImageContainer | undefined>(undefined),
    entity$: new BehaviorSubject<I3DEntityContainer | undefined>(undefined),
  };

  public cameraManager = {
    getActiveCamera: this.getActiveCamera,
    moveActiveCameraToPosition: (positionVector: Vector3) => {
      moveCameraToTarget(this.getActiveCamera(), this.scene, positionVector);
    },
    resetCamera: () => {
      this.cameraManager.setCameraType('ArcRotateCamera');
      const camera = this.getActiveCamera();
      const { position, target } = cameraDefaults$.getValue();
      setCameraTarget(camera, target);
      moveCameraToTarget(camera, this.scene, position);
    },
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
    setActiveCameraTarget: (targetVector: Vector3) =>
      setCameraTarget(this.getActiveCamera(), targetVector),
    setUpActiveCamera: (maxSize: number, mediaType: string) =>
      setUpCamera(this.getActiveCamera(), maxSize, mediaType),
    setCameraType: (type: 'ArcRotateCamera' | 'UniversalCamera') => {
      const cameras = this.scene.cameras;
      const currentType = this.cameraManager.cameraType$.getValue();
      if (type === currentType) return;
      this.cameraManager.cameraType$.next(type);

      const rotateCamera = cameras.find(
        camera => camera instanceof ArcRotateCamera,
      )! as ArcRotateCamera;
      const universalCamera = cameras.find(
        camera => camera instanceof UniversalCamera,
      )! as UniversalCamera;

      const { position, target } = cameraDefaults$.getValue();
      if (type === 'UniversalCamera') {
        universalCamera.position = rotateCamera.position.clone();
        universalCamera.setTarget(target);
        this.scene.activeCamera = universalCamera;
      } else {
        rotateCamera.position = universalCamera.position.clone();
        this.scene.activeCamera = rotateCamera;
        setCameraTarget(rotateCamera, target);
        moveCameraToTarget(rotateCamera, this.scene, position);
      }
    },
    cameraSpeed: 1.0,
    cameraType$: new BehaviorSubject<'ArcRotateCamera' | 'UniversalCamera'>('ArcRotateCamera'),
    cameraDefaults$,
  };

  public background: {
    url: string;
    color: RGBA;
    layer: Layer | undefined;
  } = {
    url: 'assets/textures/backgrounds/darkgrey.jpg',
    color: { r: 0, g: 0, b: 0, a: 0 },
    layer: undefined,
  };

  constructor(private factoryResolver: ComponentFactoryResolver, private injector: Injector) {
    this.canvas.id = 'renderCanvas';
    this.engine = new Engine(this.canvas, true, {
      audioEngine: true,
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.scene = new Scene(this.engine);
    this.scene.createDefaultEnvironment();
    this.scene.environmentIntensity = 1;

    // Add default camera
    this.scene.addCamera(createDefaultCamera(this.scene, this.canvas));
    this.scene.addCamera(createUniversalCamera(this.scene));

    const fxaa = new FxaaPostProcess('fxaa', 1.0, this.getActiveCamera());
    fxaa.samples = 16;

    const sharpen = new SharpenPostProcess('sharpen', 1.0, this.getActiveCamera());
    sharpen.edgeAmount = 0.25;

    // TODO: Adjust with sliders or embed in entitySettings
    this.scene.imageProcessingConfiguration.exposure = 1;
    this.scene.imageProcessingConfiguration.contrast = 1;
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      ImageProcessingConfiguration.TONEMAPPING_STANDARD;

    this.effects.push(fxaa, sharpen);
    console.log('Effects applied', this.effects);

    this.containers.audio$.subscribe(audioContainer => {
      if (!audioContainer) return;
      // Define as function so we can unregister by variable name
      let renderAudio = () => beforeAudioRender(this.scene, audioContainer);
      this.scene.registerBeforeRender(renderAudio);
      renderAudio = () => afterAudioRender(audioContainer);
      this.scene.registerAfterRender(renderAudio);
    });
    this.containers.video$.subscribe(videoContainer => {
      if (!videoContainer) return;
      // Define as function so we can unregister by variable name
      const renderVideo = () => beforeVideoRender(videoContainer);
      this.scene.registerBeforeRender(renderVideo);
    });

    this.scene.registerBeforeRender(() => {
      const camera = this.getActiveCamera();
      if (!camera) return;
      camera.panningSensibility =
        1000 / (this.cameraManager.cameraSpeed * Math.min(Math.max(camera.radius, 1), 10));
      camera.wheelDeltaPercentage = this.cameraManager.cameraSpeed * 0.01;
      camera.speed = this.cameraManager.cameraSpeed;

      this.scene.getMeshesByTags('marker', mesh => {
        const dist = Vector3.Distance(mesh.position, camera.position);
        const scale = Math.min(2, dist / 50);
        // Scale based on distance
        mesh.scaling = new Vector3(scale, scale, scale);
        // Fade out markers with distance < 50
        mesh.material!.alpha = Math.max(Math.min(1, scale), 0.5);
      });
    });

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Global - for debugging
    (window as any)['enableInspector'] = () => this.enableInspector();
    (window as any)['disableInspector'] = () => this.disableInspector();
    (window as any)['scene'] = () => this.getScene();
  }

  public enableInspector() {
    this.scene.debugLayer.show();
  }

  public disableInspector() {
    this.scene.debugLayer.hide();
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
    this.scene.cameras.forEach(camera => camera.attachControl(this.canvas, false));
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public setBackgroundImage(setBackground: boolean): void {
    if (setBackground) {
      const layer = new Layer('background', this.background.url, this.scene, true);
      layer.alphaBlendingMode = Engine.ALPHA_ADD;
      layer.isBackground = true;
      this.background.layer = layer;
    } else {
      this.background.layer?.dispose();
    }
  }

  public setBackgroundColor(color: RGBA): void {
    this.background.color = color;
    this.scene.clearColor = new Color4(color.r / 255, color.g / 255, color.b / 255, color.a);
  }

  public getColor(): any {
    return this.background.color;
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
    // Audio & Video
    const { audio$, video$ } = this.containers;
    const audio = audio$.getValue();
    const video = video$.getValue();
    if (audio) {
      audio.audio.dispose();
      audio.timeSlider.dispose();
      audio.currentTime = 0;
    }
    // Video
    if (video) {
      video.video.pause();
      video.video.remove();
      video.timeSlider.dispose();
      video.currentTime = 0;
    }
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

  public async loadEntity(
    clearScene: boolean,
    rootUrl: string,
    mediaType = 'model',
    isDefault?: boolean,
  ): Promise<Mesh[]> {
    this.resize();
    if (clearScene) this.clearScene();
    const { audio$, entity$, image$, video$ } = this.containers;

    switch (mediaType) {
      case 'audio':
        const meshes = entity$.getValue()!.meshes;
        return loadAudio(rootUrl, this.scene, meshes).then(result => {
          audio$.next(result);
          return [];
        });
      case 'video':
        return loadVideo(rootUrl, this.scene).then(result => {
          video$.next(result);
          return [result.plane];
        });
      case 'image':
        return loadImage(rootUrl, this.scene, isDefault).then(result => {
          image$.next(result);
          return [result.plane];
        });
      case 'entity':
      case 'model':
      default:
        return load3DEntity(rootUrl, this.scene, isDefault).then(result => {
          entity$.next(result);
          return result.meshes;
        });
    }
  }

  public async createScreenshot() {
    this.hideMesh('marker', false);
    await new Promise<any>((resolve, _) => this.getEngine().onEndFrameObservable.add(resolve));
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
    this.hideMesh('marker', true);
    return result;
  }

  public async createPreviewScreenshot(): Promise<string> {
    this.hideMesh('marker', false);

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
    this.hideMesh('marker', true);

    return result;
  }
}
