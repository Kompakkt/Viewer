/* tslint:disable:max-line-length */
import { DOCUMENT } from '@angular/common';
import { ComponentFactoryResolver, Inject, Injectable, Injector, ViewContainerRef } from '@angular/core';
import { Color4, Engine, Layer, Scene, SceneSerializer, Sound, Texture } from 'babylonjs';
import { Slider } from 'babylonjs-gui';
import 'babylonjs-loaders';

import { RenderCanvasComponent } from '../../components/render-canvas/render-canvas.component';

import { I3DModelContainer, IAudioContainer, IImageContainer, IVideoContainer } from './container.interfaces';
import { load3DModel, loadAudio, loadImage, loadVideo } from './loading-strategies';
import { LoadingScreen } from './loadingscreen';
import { LoadingscreenhandlerService } from './loadingscreenhandler.service';
import { afterAudioRender, beforeAudioRender, beforeVideoRender } from './render-strategies';
/* tslint:enable:max-line-length */

@Injectable({
  providedIn: 'root',
})
export class BabylonService {

  // Create an instance of RenderCanvasComponent
  // and use this for the Engine
  private canvasRef =
    this.factoryResolver
      .resolveComponentFactory(RenderCanvasComponent)
      .create(this.injector);
  private canvas = this.canvasRef.location.nativeElement.childNodes[0] as HTMLCanvasElement;

  private engine: Engine;
  private scene: Scene;

  public mediaType = '';
  public videoContainer: IVideoContainer;
  public audioContainer: IAudioContainer;
  public imageContainer: IImageContainer;
  public modelContainer: I3DModelContainer;

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
    private injector: Injector) {

    this.canvas.id = 'renderCanvas';
    this.engine = new Engine(this.canvas, true, {
      audioEngine: true,
      preserveDrawingBuffer: true, stencil: true,
    });
    this.scene = new Scene(this.engine);
    this.engine.loadingScreen = new LoadingScreen(
      this.canvas, '#111111', 'assets/img/kompakkt-icon.png', this.loadingScreenHandler);

    // Initialize empty, otherwise we would need to check against
    // undefined in strict mode
    this.audioContainer = {
      audio: new Sound('', '', this.scene),
      currentTime: 0,
      slider: new Slider(),
    };
    this.videoContainer = {
      video: this.document.createElement('video'),
      slider: new Slider(),
      currentTime: 0,
    };
    this.imageContainer = {
      image: new Texture('', this.scene),
    };
    this.modelContainer = {
      meshes: [], particleSystems: [],
      skeletons: [], animationGroups: [],
    };

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public getScene(): Scene {
    return this.scene;
  }

  public saveScene(): void {
    return SceneSerializer.Serialize(this.scene);
  }

  public attachCanvas(viewContainerRef: ViewContainerRef) {
    viewContainerRef.insert(this.canvasRef.hostView);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public resize(): void {
    this.engine.resize();
    this.scene.cameras.forEach(camera => camera.attachControl(this.canvas, false));
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public setBackgroundImage(background: boolean): void {
    if (background && !this.isBackground) {
      this.background = new Layer('background', this.backgroundURL, this.scene, true);
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
    this.scene.clearColor = new Color4(color.r / 255, color.g / 255, color.b / 255, color.a);
  }

  public getColor(): any {
    return this.backgroundColor;
  }

  public hideMesh(tag: string, visibility: boolean) {
    this.scene.getMeshesByTags(tag, mesh => mesh.isVisible = visibility);
  }

  private clearScene() {
    // Meshes
    this.scene.meshes.forEach(mesh => mesh.dispose());
    this.scene.meshes = [];
    // Audio
    this.audioContainer.audio.dispose();
    this.audioContainer.slider.dispose();
    this.audioContainer.currentTime = 0;
    // Video
    this.videoContainer.video.pause();
    this.videoContainer.video.remove();
    this.videoContainer.slider.dispose();
    this.videoContainer.currentTime = 0;
    // Unregister renderers
    const preObservers = this.scene.onBeforeRenderObservable['_observers'];
    const postObservers = this.scene.onAfterRenderObservable['_observers'];
    for (const observer of preObservers) {
      this.scene.unregisterBeforeRender(observer.callback);
    }
    for (const observer of postObservers) {
      this.scene.unregisterBeforeRender(observer.callback);
    }
  }

  public loadEntity(rootUrl: string, mediaType = 'model', extension = 'babylon') {

    this.engine.displayLoadingUI();
    this.clearScene();
    // TODO: manage mediaType via Observable
    this.mediaType = mediaType;
    switch (mediaType) {
      case 'audio':
        return loadAudio(rootUrl, this.scene, this.audioContainer)
          .then(result => {
            if (result) {
              this.audioContainer = result;
              this.scene.registerBeforeRender(() =>
                beforeAudioRender(this.scene, this.audioContainer));
              this.scene.registerAfterRender(() =>
                afterAudioRender(this.audioContainer));
            } else {
              throw new Error('No audio result');
            }
          });
        break;
      case 'video':
        return loadVideo(rootUrl, this.scene, this.videoContainer)
          .then(result => {
            if (result) {
              this.videoContainer = result;
              this.scene.registerBeforeRender(() =>
                beforeVideoRender(this.videoContainer));
            } else {
              throw new Error('No video result');
            }
          });
        break;
      case 'image':
        return loadImage(rootUrl, this.scene, this.imageContainer)
          .then(result => {
            if (result) {
              this.imageContainer = result;
            } else {
              throw new Error('No video result');
            }
          });
        break;
      case 'model':
      default:
        return load3DModel(rootUrl, extension, this.scene)
          .then(result => {
            if (result) {
              this.modelContainer = result;
            } else {
              throw new Error('No video result');
            }
          });
    }
  }
}
