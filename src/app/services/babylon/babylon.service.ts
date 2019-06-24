/* tslint:disable:max-line-length */
import { DOCUMENT } from '@angular/common';
import { ComponentRef, EventEmitter, Inject, Injectable, Injector, Output, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { AbstractMesh, ActionManager, Analyser, ArcRotateCamera, Axis, Camera, Color3, Color4, Engine, ExecuteCodeAction, HemisphericLight, Layer, Mesh, MeshBuilder, PointLight, Quaternion, Scene, SceneLoader, SceneSerializer, Sound, Space, StandardMaterial, Tags, Texture, Tools, TransformNode, Vector3, VideoTexture, VRExperienceHelper } from 'babylonjs';
import { AdvancedDynamicTexture, Control, Slider, StackPanel, TextBlock } from 'babylonjs-gui';
import 'babylonjs-loaders';
import { ReplaySubject } from 'rxjs';
import { RenderCanvasComponent } from '../../components/render-canvas/render-canvas.component';
/* tslint:enable:max-line-length */

import { LoadingscreenhandlerService } from '../loadingscreenhandler/loadingscreenhandler.service';
import { MessageService } from '../message/message.service';

import { LoadingScreen } from './loadingscreen';

@Injectable({
  providedIn: 'root',
})
export class BabylonService {

  @Output() vrModeIsActive: EventEmitter<boolean> = new EventEmitter();
  public isVRModeActive = false;

  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;

  private analyser: Analyser;

  private VRHelper: VRExperienceHelper | undefined;

  private CanvasSubject = new ReplaySubject<HTMLCanvasElement>();
  public CanvasObservable = this.CanvasSubject.asObservable();

  private backgroundURL = 'assets/textures/backgrounds/darkgrey.jpg';

  private actualControl: AbstractMesh | undefined;
  private selectingControl = false;
  private selectedControl = false;

  private color: {
    r: number;
    g: number;
    b: number;
    a: number;
  } = { r: 0, g: 0, b: 0, a: 0 };

  private pointlight: PointLight | undefined;
  private ambientlightUp: HemisphericLight | undefined;
  private ambientlightDown: HemisphericLight | undefined;

  private pointlightPosX: number | undefined;
  private pointlightPosY: number | undefined;
  private pointlightPosZ: number | undefined;
  public pointlightIntensity: number | undefined;

  private background: Layer | undefined;
  private isBackground: boolean | undefined;

  // FOR VR-HUD
  public vrJump = false;

  public audio: Sound;
  public mediaType = '';
  private slider: Slider;
  private currentTime = 0;
  public video: HTMLVideoElement;

  private canvasRef: ComponentRef<RenderCanvasComponent>;

  constructor(
    private message: MessageService,
    private loadingScreenHandler: LoadingscreenhandlerService,
    @Inject(DOCUMENT) private document: HTMLDocument,
    private factoryResolver: ComponentFactoryResolver,
    private injector: Injector) {
    const factory = this.factoryResolver.resolveComponentFactory(RenderCanvasComponent);
    this.canvasRef = factory.create(this.injector);
    this.canvas = this.canvasRef.location.nativeElement.childNodes[0] as HTMLCanvasElement;
    this.updateCanvas(this.canvas);

    this.canvas.id = 'renderCanvas';
    this.engine = new Engine(this.canvas, true, {
      audioEngine: true,
      preserveDrawingBuffer: true, stencil: true,
    });
    this.scene = new Scene(this.engine);
    this.engine.loadingScreen = new LoadingScreen(
      this.canvas, '#111111', 'assets/img/kompakkt-icon.png', this.loadingScreenHandler);

    this.analyser = new Analyser(this.scene);
    Engine.audioEngine['connectToAnalyser'](this.analyser);
    this.analyser.FFT_SIZE = 32;
    this.analyser.SMOOTHING = 0.9;

    // Initialize empty, otherwise we would need to check against
    // undefined in strict mode
    this.audio = new Sound('', '', this.scene);
    this.slider = new Slider();
    this.video = this.document.createElement('video');

    this.scene.registerBeforeRender(() => {
      const _cam = this.scene.getCameraByName('arcRotateCamera');
      if (this.mediaType === 'audio' && this.audio) {
        if (this.audio.isPlaying) {
          const fft = this.analyser.getByteFrequencyData();
          const audioMeshes = this.scene.getMeshesByTags('audioCenter');
          audioMeshes.forEach(mesh => {
            const scale = ((fft[15] / 320) + 0.05);
            mesh.scaling = new Vector3(scale, scale, scale);
          });
          if (Engine.audioEngine.audioContext) {
            // TODO
            this.currentTime = Engine.audioEngine.audioContext['currentTime'] - this.currentTime;
            if (this.slider) {
              this.slider.value = (this.slider.value + this.currentTime);
            }
          }
        }

        if (_cam && _cam['radius']) {
          const radius = Math.abs(_cam['radius']);
          const node = this.scene.getTransformNodeByName('mediaPanel');
          if (node) {
            node.getChildMeshes()
              .forEach(mesh => mesh.scalingDeterminant = radius / 35);
          }
        }
      }

      if (this.mediaType === 'video' && this.video) {
        if (!this.video.paused) {
          this.slider.value = this.video.currentTime;
        }
      }

      // VR-Annotation-Text-Walk
      if (this.actualControl) {
        if (this.selectingControl && !this.selectedControl) {
          this.actualControl.scaling.x += 0.005;
          this.actualControl.scaling.y += 0.005;
          // TODO: diffuseColor does not exist on type Material
          if (this.actualControl.material) {
            this.actualControl.material['diffuseColor'] = Color3.Red();
          }

          if (this.actualControl.scaling.x >= 1.5) {
            this.selectedControl = true;
          }
        }
        if (this.selectedControl) {
          this.actualControl.metadata = '1';
          this.actualControl.scaling.x = 1;
          this.actualControl.scaling.y = 1;
          // TODO: diffuseColor does not exist on type Material
          if (this.actualControl.material) {
            this.actualControl.material['diffuseColor'] = Color3.Black();
          }
          this.selectedControl = false;
          this.actualControl = undefined;
        }
      }

      // Annotation_Marker -- Fixed_Size_On_Zoom
      // const _cam = this.scene.getCameraByName('arcRotateCamera');
      if (_cam && _cam['radius']) {
        const radius = Math.abs(_cam['radius']);
        this.scene.getMeshesByTags('plane', mesh => mesh.scalingDeterminant = radius / 35);
        this.scene.getMeshesByTags('label', mesh => mesh.scalingDeterminant = radius / 35);
      }

      // FOR VR-HUD
      const _activeCamera = this.getActiveCamera();
      if (this.vrJump && _activeCamera) {
        this.vrJump = false;
        let i = 1;
        this.scene.getMeshesByTags('control', mesh => {

          const newPosition = new Vector3();
          if ((i % 2) !== 0) {
            newPosition.x = _activeCamera.position.x - 5;
            newPosition.y = _activeCamera.position.y;
            newPosition.z = _activeCamera.position.z;
            i++;
          } else {
            newPosition.x = _activeCamera.position.x + 5;
            newPosition.y = _activeCamera.position.y;
            newPosition.z = _activeCamera.position.z;
          }
          mesh.setAbsolutePosition(newPosition);
        });
      }
    });

    // TODO
    this.scene.registerAfterRender(() => {
      if (this.currentTime && this.mediaType === 'audio') {
        if (this.audio && this.audio.isPlaying) {
          if (Engine.audioEngine.audioContext) {
            this.currentTime = Engine.audioEngine.audioContext['currentTime'];
          }
        }
      }
    });

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public attachCanvas(viewContainerRef: ViewContainerRef) {
    viewContainerRef.insert(this.canvasRef.hostView);
  }

  public getActiveCamera() {
    return this.scene.activeCamera;
  }

  public updateCanvas(newCanvas: HTMLCanvasElement) {
    this.CanvasSubject.next(newCanvas);
  }

  public resize(): void {
    this.engine.resize();
    this.scene.cameras.forEach(camera => camera.attachControl(this.canvas, false));
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public createArcRotateCam(alpha: number, beta: number, radius: number): ArcRotateCamera {
    return new ArcRotateCamera('arcRotateCamera', alpha, beta, radius, Vector3.Zero(), this.scene);
  }

  public createVRHelper() {

    const vrButton = this.document.getElementById('vrbutton') as HTMLButtonElement;

    this.VRHelper = this.scene.createDefaultVRExperience({
      // Camera für VR ohne Cardboard!
      createDeviceOrientationCamera: false,
      // createDeviceOrientationCamera: false,
      useCustomVRButton: true,
      customVRButton: vrButton,
    });

    // this.VRHelper.gazeTrackerMesh = Mesh.CreateSphere("sphere1", 32, 0.1, this.scene);
    this.VRHelper.enableInteractions();
    // this.VRHelper.displayGaze = true;

    this.VRHelper.onNewMeshSelected.add(mesh => {

      switch (mesh.name) {

        case 'controlPrevious':
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        case 'controlNext':
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        default:
          this.selectingControl = false;
          this.selectedControl = false;

          if (this.actualControl) {
            this.actualControl.scaling.x = 1;
            this.actualControl.scaling.y = 1;
            this.actualControl = undefined;
          }
      }
    });

    this.VRHelper.onEnteringVRObservable.add(() => {
      this.vrModeIsActive.emit(true);
      this.isVRModeActive = true;
    });
    this.VRHelper.onExitingVRObservable.add(() => {
      this.vrModeIsActive.emit(false);
      this.isVRModeActive = false;
    });

    return this.VRHelper;
  }

  public getVRHelper() {
    return this.VRHelper;
  }

  private clearScene() {
    this.scene.meshes.forEach(mesh => mesh.dispose());
    this.scene.meshes = [];

    if (this.audio) {
      this.audio.dispose();
    }
    if (this.slider) {
      this.slider.dispose();
    }
    this.currentTime = 0;
    if (this.video) {
      this.video.pause();
      this.video.remove();
    }

  }

  public loadModel(rootUrl: string, filename: string): Promise<any> {
    this.clearScene();
    this.mediaType = 'model';

    const message = this.message;
    const engine = this.engine;

    engine.displayLoadingUI();

    return new Promise<any>((resolve, reject) => {
      SceneLoader
        .ImportMeshAsync(null, rootUrl, filename, this.scene, progress => {
          if (progress.lengthComputable) {
            engine.loadingUIText =
              `${(progress.loaded * 100 / progress.total).toFixed()}%`;
          }
        })
        .then(result => {
          engine.hideLoadingUI();
          resolve(result);
        })
        .catch(error => {
          engine.hideLoadingUI();
          message.error(error);
          reject(error);
        });
    });

  }

  private str_pad_left(string, pad, length) {
    return (new Array(length + 1).join(pad) + string).slice(-length);
  }

  private getCurrentTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = time - minutes * 60;

    return `${this.str_pad_left(minutes, '0', 2)}:${this.str_pad_left(seconds, '0', 2)}`;
  }

  private secondsToHms(sek) {
    const d = Number(sek);

    const h = Math.floor(d / 3600);
    const m = Math.floor(d % 3600 / 60);
    const s = Math.floor(d % 3600 % 60);

    return `${('0' + h).slice(-2)}:${('0' + m).slice(-2)}:${('0' + s).slice(-2)}`;
  }

  public loadAudio(rootUrl: string): Promise<any> {

    const message = this.message;
    const engine = this.engine;
    const scene = this.scene;

    this.clearScene();
    this.mediaType = 'audio';

    engine.displayLoadingUI();

    return new Promise((resolve, reject) => {
      this.makeRequest(rootUrl)
        .then(posts => {
          this.audio = new Sound(
            'Music', posts,
            scene, () => {
              engine.hideLoadingUI();
              const plane = this.createAudioScene();
              resolve(plane);
            },
            null);
          console.log('Success!', posts);
        })
        .catch(error => {
          message.error(error);
          engine.hideLoadingUI();
          reject(error);
        });
    });
  }

  public loadImage(rootUrl: string): Promise<any> {
    this.engine.displayLoadingUI();
    this.clearScene();
    this.mediaType = 'image';

    return new Promise<any>((resolve, reject) => {

      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;

        const mypicture = new Texture(rootUrl, this.scene);  // rem about CORS rules for cross-domain
        const ground = Mesh.CreateGround('gnd', width / 10, height / 10, 1, this.scene);
        Tags.AddTagsTo(ground, 'mediaGround');
        ground.rotate(Axis.X, Math.PI / 180 * -90, Space.WORLD);

        const gndmat = new StandardMaterial('gmat', this.scene);
        ground.material = gndmat;
        gndmat.diffuseTexture = mypicture;

        this.engine.hideLoadingUI();
        resolve(ground);
        return;
      };
      img.onerror = () => {
        reject();
        return;
      };
      img.src = rootUrl;
    });
  }

  public loadVideo(rootUrl: string): Promise<any> {
    this.clearScene();
    this.mediaType = 'video';

    this.engine.displayLoadingUI();

    // Video material
    const videoTexture = new VideoTexture('video', rootUrl, this.scene, false);
    // videoMat.backFaceCulling = false;

    return new Promise<any>((resolve, reject) => {
      videoTexture.onLoadObservable.add(tex => {
        this.video = videoTexture.video;
        const width = tex.getSize().width;
        const height = tex.getSize().height;
        const ground = Mesh.CreateGround('videoGround', width / 10, height / 10, 1, this.scene);
        Tags.AddTagsTo(ground, 'mediaGround');
        ground.rotate(Axis.X, Math.PI / 180 * -90, Space.WORLD);

        const videoMat = new StandardMaterial('textVid', this.scene);
        ground.material = videoMat;
        videoMat.diffuseTexture = videoTexture;
        const plane = this.createVideoScene();

        new Promise<any>((innerResolve, _) => {
          // const dummy = new Mesh('dummy', this.scene);
          this.engine.hideLoadingUI();
          innerResolve(plane);
        })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  public saveScene(): void {
    return SceneSerializer.Serialize(this.scene);
  }

  public async createScreenshot() {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, _) => this.engine.onEndFrameObservable.add(resolve));
    const result = await new Promise<string>((resolve, reject) => {
      const _activeCamera = this.getScene().activeCamera;
      if (_activeCamera instanceof Camera) {
        Tools.CreateScreenshot(
          this.getEngine(), _activeCamera, { precision: 2 }, async screenshot => {
          await fetch(screenshot)
            .then(res => res.blob())
            .then(blob =>
              Tools.Download(blob, `Kompakkt-${Date.now()}`))
            .then(() => resolve(screenshot))
            .catch(e => {
              console.error(e);
              reject(e);
            });
        });
      }
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public async createPreviewScreenshot(width?: number): Promise<string> {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, _) => this.engine.onEndFrameObservable.add(resolve));
    const result = await new Promise<string>((resolve, _) => {
      const _activeCamera = this.getScene().activeCamera;
      if (_activeCamera instanceof Camera) {
        Tools.CreateScreenshot(
          this.getEngine(), _activeCamera,
          (width)
            ? { width, height: Math.round((width / 16) * 9) }
            : { width: 400, height: 225 },
          screenshot => {
            resolve(screenshot);
          });
      }
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public hideMesh(tag: string, visibility: boolean) {
    this.scene.getMeshesByTags(tag, mesh => mesh.isVisible = visibility);
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
    this.color = color;
    this.scene.clearColor = new Color4(color.r / 255, color.g / 255, color.b / 255, color.a);
  }

  public setLightIntensity(light: string, intensity: number) {
    if (light === 'pointlight' && this.pointlight) {
      this.pointlight.intensity = intensity;
      this.pointlightIntensity = intensity;
    }
    if (light === 'ambientlightUp' && this.ambientlightUp) {
      this.ambientlightUp.intensity = intensity;
    }
    if (light === 'ambientlightDown' && this.ambientlightDown) {
      this.ambientlightDown.intensity = intensity;
    }
  }

  public createPointLight(name: string, position: any) {
    if (this.pointlight) this.pointlight.dispose();
    this.pointlight = new PointLight(
      name, new Vector3(position.x, position.y, position.z), this.scene);
    this.pointlightPosX = position.x;
    this.pointlightPosY = position.y;
    this.pointlightPosZ = position.z;

    this.pointlight.intensity = (this.pointlightIntensity) ? this.pointlightIntensity : 1.0;

    // return this.pointlight;
  }

  public createAmbientlightDown(name: string, position: any) {
    if (this.ambientlightDown) this.ambientlightDown.dispose();
    this.ambientlightDown = new HemisphericLight(
      name, new Vector3(position.x, position.y, position.z), this.scene);
  }

  public createAmbientlightUp(name: string, position: any) {
    if (this.ambientlightUp) this.ambientlightUp.dispose();
    this.ambientlightUp = new HemisphericLight(
      name, new Vector3(position.x, position.y, position.z), this.scene);
  }

  public setLightPosition(dimension: string, pos: number) {
    switch (dimension) {
      case 'x': this.pointlightPosX = pos; break;
      case 'y': this.pointlightPosY = pos; break;
      case 'z': this.pointlightPosZ = pos; break;
      default:
    }

    this.createPointLight(
      'pointlight',
      { x: this.pointlightPosX, y: this.pointlightPosY, z: this.pointlightPosZ });
  }

  public getColor(): any {
    return this.color;
  }

  public getPointlightData(): any {
    return {
      type: 'PointLight',
      position: {
        x: this.pointlightPosX,
        y: this.pointlightPosY,
        z: this.pointlightPosZ,
      },
      intensity: this.pointlightIntensity ? this.pointlightIntensity : 1,
    };
  }

  private createAudioScene(): AbstractMesh {

    // create a Center of Transformation
    const CoT = new TransformNode('mediaPanel');
    CoT.billboardMode = Mesh.BILLBOARDMODE_ALL;
    CoT.position.x = 0;
    CoT.position.y = 0;
    CoT.position.z = 0;

    // PLANE for Annotations
    const plane = MeshBuilder.CreatePlane(name, { height: 1.5, width: 20 }, this.scene);
    Tags.AddTagsTo(plane, 'controller');
    plane.renderingGroupId = 1;
    plane.material = new StandardMaterial('controlMat', this.scene);
    plane.material.alpha = 1;
    plane.parent = CoT;
    plane.position.y = -1.4;
    // plane.position.x = -8;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

    const plane2 = MeshBuilder.CreatePlane(name, { height: 3, width: 20 }, this.scene);
    plane2.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane2.renderingGroupId = 1;
    plane2.parent = CoT;
    plane2.position.y = -1;
    // plane2.position.x = -8;

    // GUI
    const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane2);

    const panel = new StackPanel();
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    this.currentTime = 0;

    const buffer = this.audio ? this.audio.getAudioBuffer() : undefined;
    this.currentTime = 0;

    const header = new TextBlock();
    buffer ? header.text = 'Length: ' + this.secondsToHms(buffer.duration) :
      header.text = 'Can not calculate length.';
    header.width = '400px';
    header.height = '150px';
    header.color = 'black';
    panel.addControl(header);

    this.slider = new Slider();
    this.slider.minimum = 0;
    this.slider.maximum = buffer ? buffer.duration : 0;
    this.slider.value = 0;
    this.slider.width = '2000px';
    this.slider.height = '300px';
    this.slider.onValueChangedObservable.add(() => {
      header.text = `Current time: ${this.secondsToHms(this.slider.value)}`;
      // Video:       header.text = 'Current time: ' + this.getCurrentTime(this.video.currentTime) + ' min.';
    });
    this.slider.onPointerDownObservable.add(() => {
      if (this.audio.isPlaying) {
        this.audio.stop();
        console.log(this.slider.value);
      }
    });
    this.slider.onPointerUpObservable.add(() => {
      this.audio.play(0, this.slider.value);
      console.log(this.slider.value);
    });

    panel.addControl(this.slider);

    // Volume

    const plane3 = MeshBuilder.CreatePlane(name, { height: 15, width: 2 }, this.scene);
    plane3.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane3.renderingGroupId = 1;
    plane3.parent = CoT;
    plane3.position.x = 2;

    const advancedTextureVol = AdvancedDynamicTexture.CreateForMesh(plane3);

    const sliderVol = new Slider();
    sliderVol.isVertical = true;
    sliderVol.minimum = 0;
    sliderVol.maximum = 1;
    sliderVol.value = this.audio.getVolume();
    sliderVol.height = '1000px';
    sliderVol.width = '150px';
    sliderVol.onValueChangedObservable.add(() => {
      this.audio.setVolume(sliderVol.value);
    });
    advancedTextureVol.addControl(sliderVol);

    // Cube

    SceneLoader.ImportMeshAsync(
      null, 'assets/models/', 'kompakkt.babylon', this.scene, _ => {
        console.log('LOADED');
      })
      .then(result => {
        console.log(result);
        const center = MeshBuilder.CreateBox('audioCenter', { size: 1 }, this.scene);
        Tags.AddTagsTo(center, 'audioCenter');
        center.isVisible = false;

        const axisX = Axis['X'];
        const axisY = Axis['Y'];

        if (!center.rotationQuaternion) {
          center.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
        }

        const rotationQuaternionX = Quaternion.RotationAxis(axisX, Math.PI / 180 * 1);
        let end = rotationQuaternionX.multiply(center.rotationQuaternion);

        const rotationQuaternionY = Quaternion.RotationAxis(axisY, Math.PI / 180 * 240);
        end = rotationQuaternionY.multiply(end);

        center.rotationQuaternion = end;

        center.scaling = new Vector3(0.05, 0.05, 0.05);

        result.meshes
          .forEach(mesh => {
            console.log('Audio gefunden');
            mesh.parent = center;
            mesh.isPickable = true;

            mesh.actionManager = new ActionManager(this.scene);
            mesh.actionManager.registerAction(new ExecuteCodeAction(
              ActionManager.OnPickTrigger, (() => {
                console.log('click');
                this.audio.isPlaying ?
                  this.audio.pause() : this.audio.play();

              })));
          });
      });
    return plane;

  }

  private createVideoScene() {
    // create a Center of Transformation
    const CoT = new TransformNode('mediaPanel');
    CoT.position.x = 0;
    CoT.position.y = 0;
    CoT.position.z = 0;

    const ground = this.scene.getMeshesByTags('mediaGround')[0];
    ground.computeWorldMatrix(true);
    const bi = ground.getBoundingInfo();
    const minimum = bi.boundingBox.minimumWorld;
    const maximum = bi.boundingBox.maximumWorld;
    const initialSize = maximum.subtract(minimum);

    ground.isPickable = true;

    ground.actionManager = new ActionManager(this.scene);
    ground.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPickTrigger, (() => {
        console.log('click');
        this.video.paused ? this.video.play() : this.video.pause();
      })));

    // PLANE for Annotations
    const plane = MeshBuilder.CreatePlane(
      name, { height: initialSize.y * 0.1, width: initialSize.x }, this.scene);
    Tags.AddTagsTo(plane, 'controller');
    plane.renderingGroupId = 1;
    plane.material = new StandardMaterial('controlMat', this.scene);
    plane.material.alpha = 1;
    plane.parent = CoT;
    plane.position.y = minimum.y - (initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15);

    // Plane for Time-Slider
    const plane2 = MeshBuilder.CreatePlane(
      name, {
        height: (initialSize.y * 0.1 > 15 ? initialSize.y * 0.1 : 15),
        width: initialSize.x,
      },
      this.scene);
    plane2.renderingGroupId = 1;
    plane2.parent = CoT;
    plane2.position.y =
      minimum.y -
      (initialSize.y * 0.1 > 15
        ? initialSize.y * 0.1
        : 15) +
      ((initialSize.y * 0.2 > 30
        ? initialSize.y * 0.2
        : 30) * 0.5);

    // GUI
    const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane2);

    const panel = new StackPanel();
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    this.currentTime = 0;

    const header = new TextBlock();
    const duration = this.video ? String(this.video.duration) : 'Can not calculate length in';
    header.text = `Length: ${duration} sec`;
    header.width = '1000px';
    header.height = '700px';
    header.color = 'black';
    panel.addControl(header);

    this.slider = new Slider();
    this.slider.minimum = 0;
    this.slider.maximum = this.video ? this.video.duration : 0;
    this.slider.value = 0;
    this.slider.width = '1100px';
    this.slider.height = '500px';
    this.slider.onValueChangedObservable.add(() => {
      header.text = `Current time: ${this.getCurrentTime(this.video.currentTime)} min.`;
    });
    this.slider.onPointerDownObservable.add(() => {
      if (!this.video.paused) {
        this.video.pause();
      }
    });
    this.slider.onPointerUpObservable.add(() => {
      this.video.currentTime = this.slider.value;
      this.video.play();
    });
    panel.addControl(this.slider);

    // Volume

    const plane3 = MeshBuilder.CreatePlane(
      name, {
        height: initialSize.y * 0.8,
        width: (initialSize.x * 0.1 > 30 ? initialSize.x * 0.1 : 30),
      },
      this.scene);
    plane3.renderingGroupId = 1;
    plane3.parent = CoT;
    plane3.position.x = maximum.x + initialSize.x * 0.1;

    const advancedTextureVol = AdvancedDynamicTexture.CreateForMesh(plane3);

    const sliderVol = new Slider();
    sliderVol.isVertical = true;
    sliderVol.minimum = 0;
    sliderVol.maximum = 1;
    sliderVol.value = this.video.volume;
    sliderVol.height = '400px';
    sliderVol.width = '50px';
    sliderVol.onValueChangedObservable.add(() => {
      this.video.volume = sliderVol.value;
    });
    advancedTextureVol.addControl(sliderVol);

    return plane;

  }

  private makeRequest(url) {

    // Create the XHR request
    const request: XMLHttpRequest = new XMLHttpRequest();

    request.responseType = 'arraybuffer';

    request.onprogress = event => {
      this.engine.loadingUIText = `${(event.loaded * 100 / event.total).toFixed()}%`;
    };

    // Return it as a Promise
    return new Promise<any>((resolve, reject) => {
      // Setup our listener to process compeleted requests
      request.onreadystatechange = () => {
        // Only run if the request is complete
        if (request.readyState === 4) {
          // Process the response
          if (request.status >= 200 && request.status < 300) {
            // If successful
            resolve(request.response);
          } else {
            // If failed
            reject({ ...request });
          }
        }
      };
      // Setup our HTTP request
      request.open('GET', url, true);

      // Send the request
      request.send();

    });
  }
}
