import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  AbstractMesh,
  Camera,
  Color3,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  PBRMaterial,
  Quaternion,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  switchMap,
} from 'rxjs';
import { IAnnotation, ICompilation, IEntity, IEntitySettings, isEntity } from 'src/common';
import { environment } from 'src/environment';
import { baseEntity } from '../../../assets/defaults';
import { defaultEntity, fallbackEntity } from '../../../assets/entities/entities';
import {
  minimalSettings,
  settings2D,
  settingsAudio,
  settingsEntity,
  settingsFallback,
  settingsKompakktLogo,
} from '../../../assets/settings/settings';
// tslint:disable-next-line:max-line-length
import { DialogPasswordComponent } from '../../components/dialogs/dialog-password/dialog-password.component';
import { decodeBase64, decodeURIUntilStable, isBase64 } from '../../helpers';
import { IIIFData, convertIIIFAnnotation, isIIIFData } from '../../helpers/iiif-data-helper';
import { BabylonService } from '../babylon/babylon.service';
import { LoadingScreenService } from '../babylon/loadingscreen';
import { BackendService } from '../backend/backend.service';
import { MessageService } from '../message/message.service';
import { OverlayService } from '../overlay/overlay.service';
import { UserdataService } from '../userdata/userdata.service';
import {
  Annotation,
  AnnotationBody,
  AnnotationPage,
  Manifest,
  Scene,
  SpecificResource,
  parseManifest,
} from '@iiif/3d-manifesto-dev';

export type QualitySetting = 'low' | 'medium' | 'high' | 'raw';
const isQualitySetting = (setting: any): setting is QualitySetting => {
  return ['low', 'medium', 'high', 'raw'].includes(setting);
};

interface IQueryParams {
  // regular params
  model?: string;
  entity?: string;
  compilation?: string;
  quality?: string;
  mode?: string;

  // iframe dataset params for standalone viewer
  standalone?: string;
  endpoint?: string;
  settings?: string;
  annotations?: string;
  manifest?: string;
  document?: string;
  resource?: string;
  minimal?: string;
  transparent?: string;
}

type Mode = '' | 'upload' | 'explore' | 'edit' | 'annotation' | 'open';
const isMode = (mode: any): mode is Mode => {
  return ['', 'upload', 'explore', 'edit', 'annotation', 'open'].includes(mode);
};

const areSettingsSet = (entity: IEntity) => {
  const { settings } = entity;
  const props: Array<keyof IEntitySettings> = [
    'preview',
    'cameraPositionInitial',
    'background',
    'lights',
    'rotation',
    'scale',
  ];
  return !props.some(prop => !settings || settings[prop] === undefined || settings[prop] === '');
};

@Injectable({
  providedIn: 'root',
})
export class ProcessingService {
  private backend: BackendService = inject(BackendService);
  private message: MessageService = inject(MessageService);
  private overlay: OverlayService = inject(OverlayService);
  public babylon: BabylonService = inject(BabylonService);
  private loadingScreen: LoadingScreenService = inject(LoadingScreenService);
  private userdata: UserdataService = inject(UserdataService);
  private dialog: MatDialog = inject(MatDialog);
  private http: HttpClient = inject(HttpClient);

  public entity$ = new BehaviorSubject<IEntity | undefined>(undefined);
  public meshes$ = new BehaviorSubject<AbstractMesh[]>([]);
  public compilation$ = new BehaviorSubject<ICompilation | undefined>(undefined);
  public mode$ = new BehaviorSubject<Mode>('');
  public settings$ = new BehaviorSubject({
    localSettings: minimalSettings,
    serverSettings: minimalSettings,
  });
  public quality$ = new BehaviorSubject<QualitySetting>('low');

  public mediaType$ = this.entity$.pipe(map(entity => entity?.mediaType));
  public isInUpload$ = this.entity$.pipe(map(entity => entity && !areSettingsSet(entity)));
  public hasMeshSettings$ = this.mediaType$.pipe(
    map(
      mediaType => mediaType && ['model', 'entity', 'cloud', 'splat', 'image'].includes(mediaType),
    ),
  );

  public compilationLoaded$ = this.compilation$.pipe(map(compilation => !!compilation?._id));
  public defaultEntityLoaded$ = this.entity$.pipe(map(entity => entity?._id === 'default'));
  public fallbackEntityLoaded$ = this.entity$.pipe(map(entity => entity?._id === 'fallback'));
  public isStandalone$ = this.entity$.pipe(map(entity => entity?._id === 'standalone_entity'));

  public standaloneAnnotations$ = new BehaviorSubject<IAnnotation[]>([]);

  // general features and modes
  public showMenu$ = new BehaviorSubject(true);
  public showSidenav$ = new BehaviorSubject(true);
  public showAnnotationEditor$ = new BehaviorSubject(true);
  public showSettingsEditor$ = new BehaviorSubject(true);

  public bootstrapped$ = new BehaviorSubject(false);

  public rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
  public entityHeight = (0).toFixed(2);
  public entityWidth = (0).toFixed(2);
  public entityDepth = (0).toFixed(2);

  isOwner$ = combineLatest({
    entity: this.entity$,
    compilation: this.compilation$,
  }).pipe(
    switchMap(async ({ entity, compilation }) => {
      const ofEntity = await this.userdata.doesUserOwn(entity);
      const ofCompilation = await this.userdata.doesUserOwn(compilation);
      return { ofEntity, ofCompilation };
    }),
  );

  isUserWhitelistedForCompilation$ = combineLatest({
    compilation: this.compilation$,
  }).pipe(
    switchMap(async ({ compilation }) => {
      if (!compilation) return false;
      return this.userdata.isUserWhitelistedFor(compilation);
    }),
  );

  isAnnotatingFeatured$ = combineLatest({
    entity: this.entity$,
    compilation: this.compilation$,
    isDefault: this.defaultEntityLoaded$,
    isFallback: this.fallbackEntityLoaded$,
    showEditor: this.showAnnotationEditor$,
    isCompilationLoaded: this.compilationLoaded$,
    isStandalone: this.isStandalone$,
    mode: this.mode$,
    isAuthenticated: this.userdata.isAuthenticated$,
    isOwner: this.isOwner$,
    isUserWhitelistedForCompilation: this.isUserWhitelistedForCompilation$,
  }).pipe(
    map(args => {
      const { entity, compilation } = args;
      if (!entity) return false;
      if (args.isStandalone) return true;

      const isAnnotatable =
        entity.mediaType === 'image' ||
        entity.mediaType === 'entity' ||
        entity.mediaType === 'cloud' ||
        entity.mediaType === 'model';

      const hideEditor = !args.showEditor || !isAnnotatable || args.isFallback;
      const shouldHideEditor = !isAnnotatable || args.isFallback;
      const isEditorVisible = args.showEditor && !args.isCompilationLoaded;

      if (hideEditor && shouldHideEditor && isEditorVisible) return false;

      if (args.isCompilationLoaded) {
        if (!compilation) return false;
        if (compilation.whitelist.enabled) {
          if (!args.isAuthenticated) return false;
          return args.isUserWhitelistedForCompilation || args.isOwner.ofCompilation;
        } else {
          return args.isOwner.ofCompilation;
        }
      } else {
        if ((args.isDefault || args.isFallback) && args.mode === 'annotation') return true;
        if (args.isOwner.ofEntity) return true;
      }
      return false;
    }),
    distinctUntilChanged(),
  );

  hasAnnotationAllowance$ = combineLatest({
    isStandalone: this.isStandalone$,
    sidenav: this.overlay.sidenav$,
    isInUpload: this.isInUpload$,
    isAnnotatingFeatured: this.isAnnotatingFeatured$,
    isAuthenticated: this.userdata.isAuthenticated$,
  }).pipe(
    map(args => {
      if (args.isInUpload) return false;
      if (!args.sidenav.open) return false;
      if (!args.isAnnotatingFeatured) return false;
      if (args.isStandalone) return true;
      if (args.sidenav.mode === 'annotation' && args.isAuthenticated) return true;
      return false;
    }),
    distinctUntilChanged(),
  );

  state$ = combineLatest([this.entity$, this.settings$, this.meshes$, this.compilation$]).pipe(
    map(([entity, { localSettings }, meshes, compilation]) => ({
      entity,
      settings: localSettings,
      meshes,
      compilation,
    })),
    debounceTime(100),
  );

  constructor() {
    this.entity$.pipe(filter(isEntity)).subscribe(entity => this.handleEntitySettings(entity));
  }

  private handleEntitySettings(entity: IEntity) {
    if (areSettingsSet(entity)) {
      this.settings$.next({
        localSettings: entity.settings,
        serverSettings: entity.settings,
      });
    } else {
      const settings = (() => {
        if (entity._id === 'default') return settingsKompakktLogo;
        if (entity._id === 'fallback') return settingsFallback;
        switch (entity.mediaType) {
          case 'entity':
          case 'model':
          case 'cloud':
            return settingsEntity;
          case 'audio':
            return settingsAudio;
          case 'video':
            return settings2D;
          case 'image':
            return settings2D;
          default:
            return settingsEntity;
        }
      })();
      this.settings$.next({
        localSettings: settings,
        serverSettings: settings,
      });
    }
  }

  public updateEntityQuality(quality: QualitySetting) {
    this.quality$.next(quality);
  }

  public updateActiveEntity(entity: IEntity | undefined, meshes: AbstractMesh[]) {
    console.log('New loaded Entity:', { entity, meshes });
    this.entity$.next(entity);

    const isPickableMode = ['upload', 'annotation'].includes(this.mode$.getValue());
    meshes.forEach(mesh => {
      mesh.isPickable = isPickableMode;
    });
    this.babylon
      .getScene()
      .getMeshesByTags('videoPlane')
      .forEach(mesh => {
        mesh.renderingGroupId = 3;
      });
    this.meshes$.next(meshes);
    this.babylon.resize();
  }

  public async updateActiveCompilation(compilation: ICompilation | undefined) {
    this.compilation$.next(compilation);
  }

  public async bootstrap() {
    const queryParams = new URLSearchParams(location.search);
    const hashParams = location.hash.startsWith('#?')
      ? new URLSearchParams(location.hash.slice(2))
      : new URLSearchParams();
    const entries = Object.fromEntries([
      ...Array.from(hashParams.entries()),
      ...Array.from(queryParams.entries()),
    ]) as IQueryParams;

    const entityParam = entries['model'] ?? entries['entity'] ?? undefined;
    const compParam = entries['compilation'] ?? undefined;
    const manifestParam = entries['manifest'] ?? entries['document'] ?? undefined;
    const qualityParam = entries['quality'] ?? 'low';
    if (isQualitySetting(qualityParam)) this.updateEntityQuality(qualityParam);
    // values = upload, explore, edit, annotation, open
    const mode = entries['mode'] ?? '';
    if (isMode(mode)) this.mode$.next(mode);

    // check if standalone and exit early to init standalone mode
    const isStandalone = !!entries['standalone'] || !!manifestParam;
    if (isStandalone) return this.loadStandaloneEntity(entries);

    if (entries.transparent) this.babylon.isTransparent.set(true);

    // loading         // modes
    // default        '', explore, annotation, open
    // compilation    '', explore, annotation, open
    // entity         '', explore, annotation, open, upload, edit

    // Setzen: Login required, menu, sidenav: annotation, settings

    // !menu -> mode = ''
    // !sidenav -> !compilation && mode = '' || mode = open
    // sidenav: !settings -> !sidenav
    // sidenav: !annotation -> !sidenav, mode != annotation && mode != upload
    // login required: mode = upload, mode = edit, mode = annotation && !default

    // 1) set login required
    if (
      mode === 'upload' ||
      mode === 'edit' ||
      (mode === 'annotation' && (entityParam || compParam))
    ) {
      await this.userdata.userAuthentication(true);
    }

    if (mode === 'annotation' && !entityParam && !compParam) {
      await this.userdata.userAuthentication(false);
    }

    // 3) Load Entity and compilation
    if (compParam || entityParam) {
      this.fetchAndLoad(entityParam, compParam);
    } else {
      this.loadDefaultEntityData();
    }

    // 2) check modes
    this.showMenu$.next(!!mode);

    // Default
    let showAnnotationEditor = true;
    let showSettingsEditor = true;

    if (!mode || mode === 'open') {
      showAnnotationEditor = false;
      showSettingsEditor = false;
      if (!compParam) {
        this.showSidenav$.next(false);
      }
    }

    if (mode !== 'annotation' && mode !== 'upload') {
      showAnnotationEditor = false;
    }

    this.showAnnotationEditor$.next(showAnnotationEditor);
    this.showSettingsEditor$.next(showSettingsEditor);

    // 4) toggle sidenav
    switch (mode) {
      case 'annotation':
        this.overlay.toggleSidenav('annotation', true);
        break;
      case 'edit':
      case 'explore':
      case 'upload':
        this.overlay.toggleSidenav('settings', true);
        break;
      case 'open':
      default:
        if (compParam) this.overlay.toggleSidenav('compilationBrowser', true);
    }
    // TODO: error handling: wrong mode for loading

    this.bootstrapped$.next(true);
  }

  private async loadIIIF3DManifest(manifestUrl: string) {
    const normalizedUrl = decodeURIUntilStable(manifestUrl.trim().replace(/^['"]|['"]$/g, ''));
    const manifestJson = await fetch(normalizedUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        return res.json() as object;
      })
      .catch(error => {
        console.log('Error loading manifest:', error);
        return undefined;
      });
    if (!manifestJson) {
      console.error('Manifest could not be loaded from URL', normalizedUrl);
      this.message.error('Manifest could not be loaded from URL.');
      return;
    }
    return this.processIIIF3DManifest(manifestJson);
  }

  private async processIIIF3DManifest(manifestJson: object) {
    this.loadingScreen.show();
    this.standaloneAnnotations$.next([]);

    try {
      this.babylon.clearScene();
      this.babylon.cameraManager.setCameraType('ArcRotateCamera');
    } catch (error) {
      console.warn('[IIIF] Failed to clear scene before import', error);
    }

    let manifest: Manifest | undefined;
    try {
      manifest = parseManifest(manifestJson) as Manifest;
    } catch (error) {
      console.error('[IIIF] Manifest parsing failed', error);
      this.message.error('Failed to parse IIIF manifest JSON.');
      this.loadingScreen.hide();
      return;
    }

    const sequences = manifest?.getSequences?.() ?? [];
    const sequenceScenes = sequences.flatMap(seq => (seq?.getScenes ? seq.getScenes() : []));
    const directScenes = (() => {
      const rawItems = (manifest as any)?.__jsonld?.items;
      if (!Array.isArray(rawItems)) return [];
      return rawItems.filter((item: any) => item?.type === 'Scene');
    })();
    const scenes = sequenceScenes.length ? sequenceScenes : directScenes;
    const scene = scenes?.at(0); // TODO: Allow scene selection
    console.log('loadIIIF3DManifest', manifest, scenes, scene);

    if (!scene) {
      console.warn('No scene found in manifest');
      this.message.error('No scene found in IIIF manifest.');
      this.loadingScreen.hide();
      return;
    }

    const entitySettings = JSON.parse(JSON.stringify(minimalSettings)) as IEntitySettings;
    (entitySettings as any).skipInitialCameraSetup = true;
    this.babylon.getScene().environmentIntensity = 1;
    let hasExplicitLights = false;

    const parseHexColor = (hex: string) => {
      const normalized = hex.replace('#', '').trim();
      if (normalized.length !== 6) return undefined;
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      if ([r, g, b].some(v => Number.isNaN(v))) return undefined;
      return { r, g, b, a: 1 };
    };

    const getManifestBackgroundColor = () => {
      const bgColor = scene?.getBackgroundColor?.();
      const sceneJson = (scene as any)?.__jsonld ?? scene;
      const rawBackground =
        sceneJson?.backgroundColor ??
        sceneJson?.background?.color ??
        (sceneJson?.background && typeof sceneJson.background === 'string'
          ? sceneJson.background
          : undefined);

      const color = bgColor
        ? { r: bgColor.red, g: bgColor.green, b: bgColor.blue, a: 1 }
        : typeof rawBackground === 'string'
          ? parseHexColor(rawBackground)
          : undefined;
      return color;
    };

    const manifestBackground = getManifestBackgroundColor();
    if (manifestBackground) {
      entitySettings.background = {
        color: manifestBackground,
        effect: false,
      };
      console.log('background color', manifestBackground);
      this.babylon.setBackgroundColor(manifestBackground);
      this.babylon.setBackgroundImage(false);
      this.babylon.hideBackgroundHelpers();
    }

    let hasProcessedCamera = false;
    let applyExplicitCamera: (() => void) | undefined;
    const loadedMeshes: AbstractMesh[] = [];
    const annotationPositions = new Map<string, Vector3>();
    const manifestItems = Array.isArray((manifestJson as any)?.items)
      ? ((manifestJson as any).items as any[])
      : [];

    const getSpecificResourceSource = (body: any) => {
      const source = body?.type === 'SpecificResource' ? body.source : body;
      return Array.isArray(source) ? source[0] : source;
    };

    const getRawValue = (value: any, fallback = 1) =>
      Number(typeof value === 'number' ? value : (value?.value ?? fallback));

    const getPointSelectorPosition = (selector: any) => {
      if (selector?.type !== 'PointSelector') return undefined;
      return new Vector3(
        Number(selector.x ?? 0) * -1,
        Number(selector.y ?? 0),
        Number(selector.z ?? 0),
      );
    };

    const getSelectorPosition = (annotation: any) => {
      const selector = Array.isArray(annotation?.target?.selector)
        ? annotation.target.selector[0]
        : annotation?.target?.selector;
      return getPointSelectorPosition(selector) ?? Vector3.Zero();
    };

    const getAnnotationPointSelectorPosition = (annotation: any) => {
      const selector = Array.isArray(annotation?.target?.selector)
        ? annotation.target.selector[0]
        : annotation?.target?.selector;
      return getPointSelectorPosition(selector);
    };

    const getLoadedMeshBounds = () => {
      const bounds = loadedMeshes
        .filter(mesh => !mesh.isDisposed())
        .map(mesh => mesh.getBoundingInfo().boundingBox);
      if (!bounds.length) return undefined;

      const min = bounds
        .map(bound => bound.minimumWorld)
        .reduce((current, next) => Vector3.Minimize(current, next));
      const max = bounds
        .map(bound => bound.maximumWorld)
        .reduce((current, next) => Vector3.Maximize(current, next));

      return { min, max, size: max.subtract(min), center: min.add(max).scale(0.5) };
    };

    const getRawTransformVector = (transform: any) =>
      new Vector3(Number(transform?.x ?? 0), Number(transform?.y ?? 0), Number(transform?.z ?? 0));

    const getBodyTransforms = (body: any, source: any = body) => {
      if (Array.isArray(body?.transform)) return body.transform;
      if (Array.isArray(source?.transform)) return source.transform;
      return [];
    };

    const getTransformPosition = (transforms: any[]) => {
      const translations = transforms.filter(
        transform => transform?.type?.toLowerCase() === 'translatetransform',
      );
      if (!translations.length) return undefined;

      return translations.reduce(
        (position, transform) =>
          position.add(getRawTransformVector(transform).multiply(new Vector3(-1, 1, 1))),
        Vector3.Zero(),
      );
    };

    const rotateDirection = (direction: Vector3, transforms: any[] = []) => {
      return transforms.reduce((currentDirection, transform) => {
        if (transform?.type?.toLowerCase() !== 'rotatetransform') return currentDirection;
        const angles = getRawTransformVector(transform)
          .multiply(new Vector3(-1, 1, 1))
          .multiplyByFloats(Math.PI / 180, Math.PI / 180, Math.PI / 180)
          .negate();
        const rotation = Quaternion.FromEulerVector(angles);
        return currentDirection.applyRotationQuaternion(rotation).normalize();
      }, direction.clone());
    };

    const processAmbientLightBody = (body: any) => {
      hasExplicitLights = true;
      const color = typeof body?.color === 'string' ? parseHexColor(body.color) : undefined;
      const diffuse = color
        ? new Color3(color.r / 255, color.g / 255, color.b / 255)
        : Color3.White();
      const intensity = getRawValue(body?.intensity);
      const light = new HemisphericLight(
        body?.id ?? 'iiif-ambient-light',
        Vector3.Up(),
        this.babylon.getScene(),
      );

      light.diffuse = diffuse;
      light.groundColor = diffuse;
      light.specular = Color3.Black();
      light.intensity = Number.isFinite(intensity) ? intensity : 1;
    };

    const getRawBody = (body: any) => body?.__jsonld ?? body;

    const getBodyType = (body: AnnotationBody | any) => {
      const rawBody = getRawBody(body);
      const source = Array.isArray(rawBody?.source) ? rawBody.source[0] : rawBody?.source;
      const bodyType = typeof body?.getType === 'function' ? body.getType() : rawBody?.type;
      const type = bodyType === 'SpecificResource' ? source?.type : (bodyType ?? source?.type);
      return typeof type === 'string' ? type.toLowerCase() : undefined;
    };

    const processDirectionalLightBody = (annotation: any, body: any) => {
      hasExplicitLights = true;
      const source = getSpecificResourceSource(body);
      const position = getSelectorPosition(annotation);
      const lookAtId = source?.lookAt?.id ?? body?.lookAt?.id;
      const lookAtPosition = lookAtId ? annotationPositions.get(lookAtId) : undefined;
      const baseDirection = lookAtPosition
        ? lookAtPosition.subtract(position).normalize()
        : Vector3.Down();
      const direction = rotateDirection(baseDirection, body?.transform);
      const intensity = getRawValue(source?.intensity ?? body?.intensity);
      const light = new DirectionalLight(
        source?.id ?? body?.id ?? 'iiif-directional-light',
        direction,
        this.babylon.getScene(),
      );

      if (typeof source?.color === 'string' || typeof body?.color === 'string') {
        const parsedColor = parseHexColor(source?.color ?? body.color);
        if (parsedColor) {
          light.diffuse = new Color3(parsedColor.r / 255, parsedColor.g / 255, parsedColor.b / 255);
        }
      }
      light.position = position;
      light.intensity = Number.isFinite(intensity) ? intensity : 1;
    };

    const processCameraBody = (
      annotation: any,
      body: any,
      cameraMode: typeof Camera.PERSPECTIVE_CAMERA | typeof Camera.ORTHOGRAPHIC_CAMERA,
    ) => {
      const source = getSpecificResourceSource(body);
      const lookAt = source?.lookAt ?? body?.lookAt;
      const transforms = getBodyTransforms(body, source);

      hasProcessedCamera = true;
      applyExplicitCamera = () => {
        const bounds = getLoadedMeshBounds();
        const selectorPosition = getAnnotationPointSelectorPosition(annotation);
        const transformPosition = getTransformPosition(transforms);
        const position = selectorPosition ?? transformPosition ?? Vector3.Zero();
        const lookAtId = lookAt?.id;
        const lookAtPosition = lookAtId ? annotationPositions.get(lookAtId) : undefined;
        const lookAtPoint = getPointSelectorPosition(lookAt);
        const rotationDirection = transforms.some(
          (transform: any) => transform?.type?.toLowerCase() === 'rotatetransform',
        )
          ? rotateDirection(new Vector3(0, 0, -1), transforms)
          : undefined;
        const target =
          lookAtPosition ??
          lookAtPoint ??
          (rotationDirection
            ? position.add(
                rotationDirection.scale(
                  bounds ? Math.max(Vector3.Distance(position, bounds.center), 1) : 1,
                ),
              )
            : (bounds?.center ?? position.add(new Vector3(0, 0, -1))));

        this.babylon.cameraManager.setCameraType('ArcRotateCamera');
        const camera = this.babylon.getScene().activeCamera as any;
        camera.setTarget(target, true);
        if (typeof camera.setPosition === 'function') {
          camera.setPosition(position.clone());
        } else {
          camera.position = position.clone();
        }
        camera.mode = cameraMode;
        if (cameraMode === Camera.ORTHOGRAPHIC_CAMERA) {
          const canvas = this.babylon.getCanvas();
          const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
          const bounds = getLoadedMeshBounds();
          const halfHeight = bounds
            ? Math.max(bounds.size.y / 2, bounds.size.x / (2 * aspect), bounds.size.z / 2, 1) * 1.2
            : 1;
          camera.orthoTop = halfHeight;
          camera.orthoBottom = -halfHeight;
          camera.orthoLeft = -halfHeight * aspect;
          camera.orthoRight = halfHeight * aspect;
        }
        camera.attachControl(this.babylon.getCanvas(), false);
        if (typeof source?.fieldOfView === 'number') {
          camera.fov = (source.fieldOfView * Math.PI) / 180;
        }
      };
    };

    const processPerspectiveCameraBody = (annotation: any, body: any) =>
      processCameraBody(annotation, body, Camera.PERSPECTIVE_CAMERA);

    const processOrthographicCameraBody = (annotation: any, body: any) =>
      processCameraBody(annotation, body, Camera.ORTHOGRAPHIC_CAMERA);

    const getCanvasById = (canvasId: string) =>
      manifestItems.find(item => item?.id === canvasId && item?.type === 'Canvas');

    const getCanvasImageBody = (canvas: any) => {
      const annotationPages = Array.isArray(canvas?.items) ? canvas.items : [];
      for (const page of annotationPages) {
        const annotations = Array.isArray(page?.items) ? page.items : [];
        for (const annotation of annotations) {
          const body = Array.isArray(annotation?.body) ? annotation.body[0] : annotation?.body;
          if (body?.type === 'Image' && body?.id) return body;
        }
      }
      return undefined;
    };

    const getCanvasImageUrl = (imageBody: any) => {
      const service = Array.isArray(imageBody?.service) ? imageBody.service[0] : imageBody?.service;
      const serviceId = service?.id ?? service?.['@id'];
      if (serviceId) return `${serviceId}/full/1024,/0/default.jpg`;
      return imageBody?.id;
    };

    const getPolygonZPoints = (annotation: any): Vector3[] | undefined => {
      const selector = Array.isArray(annotation?.target?.selector)
        ? annotation.target.selector[0]
        : annotation?.target?.selector;
      if (selector?.type !== 'PolygonZSelector' || typeof selector.value !== 'string') {
        return undefined;
      }

      const match = selector.value.match(/POLYGONZ\s*\(\((.*)\)\)/i);
      if (!match) return undefined;

      const points = match[1]
        .split(',')
        .map((point: string) => point.trim().split(/\s+/).map(Number))
        .filter((point: number[]) => point.length === 3 && point.every(Number.isFinite))
        .map(([x, y, z]: number[]) => new Vector3(x * -1, y, z));

      return points.length >= 4 ? points : undefined;
    };

    const getCanvasUVs = (canvas: any, polygon: Vector3[]) => {
      const draftOrderUVs = [0, 0, 0, 1, 1, 1, 1, 0];
      const reversedOrderUVs = [0, 0, 1, 0, 1, 1, 0, 1];
      const width = Number(canvas?.width ?? 0);
      const height = Number(canvas?.height ?? 0);

      if (polygon.length < 4 || width <= 0 || height <= 0 || width === height) {
        return draftOrderUVs;
      }

      const firstEdge = Vector3.Distance(polygon[0], polygon[1]);
      const closingEdge = Vector3.Distance(polygon[0], polygon[3]);
      if (firstEdge === 0 || closingEdge === 0) return draftOrderUVs;

      const edgeRatio = firstEdge / closingEdge;
      const draftOrderRatio = height / width;
      const reversedOrderRatio = width / height;

      return Math.abs(edgeRatio - reversedOrderRatio) < Math.abs(edgeRatio - draftOrderRatio)
        ? reversedOrderUVs
        : draftOrderUVs;
    };

    const processCanvasBody = async (annotation: any, body: any) => {
      const canvas = getCanvasById(body?.id);
      const polygon = getPolygonZPoints(annotation);
      if (!canvas || !polygon) {
        console.warn(`Failed processing IIIF Canvas body`, { canvas, polygon, annotation, body });
        return;
      }

      const scene = this.babylon.getScene();
      const canvasId = body.id ?? 'iiif-canvas';
      const canvasUVs = getCanvasUVs(canvas, polygon);
      const background =
        typeof canvas?.backgroundColor === 'string'
          ? parseHexColor(canvas.backgroundColor)
          : undefined;
      const backgroundColor = background
        ? new Color3(background.r / 255, background.g / 255, background.b / 255)
        : Color3.White();

      const createCanvasSide = (name: string, indices: number[], material: StandardMaterial) => {
        const plane = new Mesh(name, scene);
        const vertexData = new VertexData();
        vertexData.positions = polygon.flatMap(point => point.asArray());
        vertexData.indices = indices;
        vertexData.uvs = canvasUVs;
        const normals: number[] = [];
        VertexData.ComputeNormals(vertexData.positions, vertexData.indices, normals);
        vertexData.normals = normals;
        vertexData.applyToMesh(plane);
        plane.material = material;
        plane.renderingGroupId = 1;
        return plane;
      };

      const imageBody = getCanvasImageBody(canvas);
      const imageUrl = getCanvasImageUrl(imageBody);
      const texture = imageUrl ? new Texture(imageUrl, scene, false, true) : undefined;
      const imageMaterial = new StandardMaterial(`${canvasId}-image-material`, scene);
      imageMaterial.diffuseColor = imageUrl ? Color3.White() : backgroundColor;
      if (texture) {
        imageMaterial.diffuseTexture = texture;
        imageMaterial.emissiveTexture = texture;
        imageMaterial.emissiveColor = Color3.White();
      }
      imageMaterial.backFaceCulling = true;

      const backgroundMaterial = new StandardMaterial(`${canvasId}-background-material`, scene);
      backgroundMaterial.diffuseColor = backgroundColor;
      backgroundMaterial.emissiveColor = backgroundColor;
      if (!background && texture) {
        backgroundMaterial.diffuseTexture = texture;
        backgroundMaterial.emissiveTexture = texture;
        backgroundMaterial.emissiveColor = Color3.White();
      }
      backgroundMaterial.backFaceCulling = true;

      const imagePlane = createCanvasSide(`${canvasId}-image`, [0, 1, 2, 0, 2, 3], imageMaterial);
      const backgroundPlane = createCanvasSide(
        `${canvasId}-background`,
        [0, 2, 1, 0, 3, 2],
        backgroundMaterial,
      );

      const transformNode = new TransformNode(`transformNode-${canvasId}`, scene);
      imagePlane.setParent(transformNode);
      backgroundPlane.setParent(transformNode);
      loadedMeshes.push(imagePlane, backgroundPlane);
      return transformNode;
    };

    const processRawModelBody = async (annotation: any, body: any) => {
      const source = getSpecificResourceSource(body);
      const entityUrl = source?.id;
      if (!entityUrl) {
        console.warn(`Failed getting entity URL from annotation body`, body);
        return;
      }

      const meshes = await this.babylon.addEntityToScene(entityUrl);
      if (meshes?.length) loadedMeshes.push(...meshes);
      const transformNode = new TransformNode(
        `transformNode-${entityUrl}`,
        this.babylon.getScene(),
      );
      meshes.filter(mesh => !mesh.parent).forEach(mesh => mesh.setParent(transformNode));

      const transforms = Array.isArray(body?.transform) ? body.transform : [];
      const getValue = (t: any, key: 'x' | 'y' | 'z') => Number(t?.[key] ?? 0);
      const getVector = (t: any) =>
        new Vector3(getValue(t, 'x'), getValue(t, 'y'), getValue(t, 'z'));
      const xInversion = new Vector3(-1, 1, 1);

      for (const transform of transforms) {
        const transformType = transform?.type?.toLowerCase();
        const vector = getVector(transform);
        if (transformType === 'scaletransform') {
          transformNode.scaling = transformNode.scaling.multiply(vector);
          transformNode.position = transformNode.position.multiply(vector);
        }
        if (transformType === 'rotatetransform') {
          const angles = vector
            .multiply(xInversion)
            .multiplyByFloats(Math.PI / 180, Math.PI / 180, Math.PI / 180)
            .negate();
          transformNode.rotation = Quaternion.FromEulerVector(angles).toEulerAngles();
        }
        if (transformType === 'translatetransform') {
          transformNode.position.addInPlace(vector.multiply(xInversion));
        }
      }

      transformNode.position.addInPlace(getSelectorPosition(annotation));
      annotationPositions.set(annotation.id, transformNode.position.clone());

      return transformNode;
    };

    const processRawBody = async (annotation: any, body: any) => {
      const type = getBodyType(body);
      if (type === 'ambientlight') {
        processAmbientLightBody(body);
        return;
      }
      if (type === 'directionallight') {
        processDirectionalLightBody(annotation, body);
        return;
      }
      if (type === 'perspectivecamera') {
        processPerspectiveCameraBody(annotation, body);
        return;
      }
      if (type === 'orthographiccamera') {
        processOrthographicCameraBody(annotation, body);
        return;
      }
      if (type === 'canvas') {
        return processCanvasBody(annotation, body);
      }
      if (type === 'model' || body?.type === 'SpecificResource') {
        return processRawModelBody(annotation, body);
      }
      console.warn(`Unsupported IIIF 3D annotation body type`, body);
      return;
    };

    const processBody = async (annotation: Annotation, body: AnnotationBody) => {
      console.log('json', annotation.__jsonld);
      const bodyType = getBodyType(body);
      if (bodyType === 'ambientlight') {
        processAmbientLightBody(getRawBody(body));
        return;
      }
      if (bodyType === 'directionallight') {
        processDirectionalLightBody(annotation.__jsonld, getRawBody(body));
        return;
      }
      if (bodyType === 'perspectivecamera') {
        processPerspectiveCameraBody(annotation.__jsonld, getRawBody(body));
        return;
      }
      if (bodyType === 'orthographiccamera') {
        processOrthographicCameraBody(annotation.__jsonld, getRawBody(body));
        return;
      }
      if (bodyType === 'canvas') {
        return processCanvasBody(annotation.__jsonld, getRawBody(body));
      }

      const annotationBody = body.isSpecificResource()
        ? ((body as unknown as SpecificResource).getSource() as AnnotationBody)
        : body.getType()?.toLowerCase() === 'model'
          ? body
          : undefined;

      const entityUrl = typeof annotationBody === 'string' ? annotationBody : annotationBody?.id;
      if (!entityUrl) {
        console.warn(`Failed getting entity URL from annotation body`, body);
        return;
      }
      console.log('processBody', entityUrl);

      const meshes = await this.babylon.addEntityToScene(entityUrl);
      if (meshes?.length) loadedMeshes.push(...meshes);
      const transformNode = new TransformNode(
        `transformNode-${entityUrl}`,
        this.babylon.getScene(),
      );
      meshes.filter(mesh => !mesh.parent).forEach(mesh => mesh.setParent(transformNode));

      /*
      Beginning of section in which the parameters of the transforms in the body
      and the PointSelector in the target used to calculate the parameters of the
      Babylon.js transformNode.
      */
      const transforms = (() => {
        try {
          return body.getTransform();
        } catch (error) {
          console.warn(`Failed getting transforms from annotation body`, error);
          return [];
        }
      })();
      const getValue = (t: any, key: 'x' | 'y' | 'z') =>
        Number(typeof t?.getProperty === 'function' ? (t.getProperty(key) ?? 0) : (t?.[key] ?? 0));
      const getVector = (t: any) =>
        new Vector3(getValue(t, 'x'), getValue(t, 'y'), getValue(t, 'z'));
      const isScale = (t: any) =>
        typeof t?.isScaleTransform === 'function'
          ? t.isScaleTransform()
          : t?.isScaleTransform || t?.type?.toLowerCase() === 'scaletransform';
      const isRotate = (t: any) =>
        typeof t?.isRotateTransform === 'function'
          ? t.isRotateTransform()
          : t?.isRotateTransform || t?.type?.toLowerCase() === 'rotatetransform';
      const isTranslate = (t: any) =>
        typeof t?.isTranslateTransform === 'function'
          ? t.isTranslateTransform()
          : t?.isTranslateTransform || t?.type?.toLowerCase() === 'translatetransform';

      for (const transform of transforms) {
        const vector = getVector(transform);
        // IIIF to Babylon axis conversion
        const x_inversion = new Vector3(-1, 1, 1);

        if (isScale(transform)) {
          // Apply scale directly (mirroring if negative)
          transformNode.scaling = transformNode.scaling.multiply(vector);
          transformNode.position = transformNode.position.multiply(vector);
        }
        if (isRotate(transform)) {
          const deg_to_radians = Math.PI / 180.0;
          const angles = vector
            .multiply(x_inversion)
            .multiplyByFloats(deg_to_radians, deg_to_radians, deg_to_radians)
            .negate();

          const axesOrder = [0, 1, 2];
          const initQuat = Quaternion.Identity();
          const accQuat = axesOrder.reduce((acc, axis) => {
            const axisVectorArray = [0.0, 0.0, 0.0];
            axisVectorArray[axis] = 1.0;
            const axisVector = new Vector3().fromArray(axisVectorArray);
            const axisAngle = angles.asArray()[axis];
            const axisQuat = Quaternion.RotationAxis(axisVector, axisAngle);
            return acc.multiply(axisQuat);
          }, initQuat);

          const netQuat = accQuat.multiply(Quaternion.FromEulerVector(transformNode.rotation));

          transformNode.rotation = netQuat.toEulerAngles();
          transformNode.position.applyRotationQuaternionInPlace(netQuat);
        }
        if (isTranslate(transform)) {
          transformNode.position.addInPlace(vector.multiply(x_inversion));
        }
      }

      const pointSelector = (() => {
        try {
          return annotation.getTarget()?.getSelector();
        } catch (error) {
          console.warn(`Failed getting point selector from annotation target`, error);
          return undefined;
        }
      })();

      const targetSelectorPosition = new Vector3(
        Number(pointSelector?.getProperty('x') ?? 0) * -1,
        Number(pointSelector?.getProperty('y') ?? 0),
        Number(pointSelector?.getProperty('z') ?? 0),
      );

      transformNode.position.addInPlace(targetSelectorPosition);
      annotationPositions.set(annotation.id, transformNode.position.clone());
      /*
      Beginning of section in which the parameters of the transforms in the body
      and the PointSelector in the target used to calculate the parameters of the
      Babylon.js transformNode.
      */

      return transformNode;
    };

    const transformNodes = new Array<TransformNode>();

    const processAnnotation = async (annotation: Annotation | AnnotationPage) => {
      const isBody = (object: any): object is Annotation => {
        return object['getBody'] !== undefined;
      };

      type CommentPage = {
        items: {
          id: string;
          type: 'Annotation';
          bodyValue: string;
          target: {
            selector: { x: number; y: number; z: number } | { x: number; y: number; z: number }[];
            source: unknown[];
          };
        }[];
      };

      const isCommentPage = (object: any): object is CommentPage => {
        return (
          object !== undefined &&
          object['items'] !== undefined &&
          object['items'].some(
            (item: any) => item.type === 'Annotation' && item.bodyValue !== undefined,
          )
        );
      };

      console.log(annotation, isCommentPage(annotation), (annotation as any).bodyValue);

      const rawAnnotation = (annotation as any).__jsonld ?? annotation;
      if (
        rawAnnotation?.type === 'Annotation' &&
        rawAnnotation.body &&
        getBodyType(rawAnnotation.body) === 'canvas'
      ) {
        const transformNode = await processRawBody(rawAnnotation, rawAnnotation.body);
        if (transformNode) {
          transformNodes.push(transformNode);
        }
        return;
      }

      if (isBody(annotation)) {
        for await (const body of annotation.getBody()) {
          const transformNode = await processBody(annotation, body);
          if (transformNode) {
            transformNodes.push(transformNode);
          }
        }
      }

      if (!isBody(annotation) && rawAnnotation?.type === 'AnnotationPage') {
        for (const item of rawAnnotation.items ?? []) {
          await processAnnotation(item);
        }
      }
      if (!isBody(annotation) && rawAnnotation?.type === 'Annotation' && rawAnnotation.body) {
        const transformNode = await processRawBody(rawAnnotation, rawAnnotation.body);
        if (transformNode) {
          transformNodes.push(transformNode);
        }
      }

      const page = (() => {
        if (isCommentPage(annotation)) return annotation;
        if (rawAnnotation?.bodyValue !== undefined) {
          const page = { items: [rawAnnotation] } as unknown as CommentPage;
          console.log('Page', page);
          return page;
        }
        return undefined;
      })();

      if (isCommentPage(page)) {
        const items = page.items.filter(item => item.bodyValue !== undefined);
        const manufacturedAnnotations = new Array<IAnnotation>();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const firstSelector = Array.isArray(item.target.selector)
            ? item.target.selector[0]
            : item.target.selector;

          firstSelector.x = firstSelector.x * -1;

          const position = Vector3.Zero()
            .subtract(new Vector3(firstSelector.x, firstSelector.y, firstSelector.z))
            .normalize();

          console.log('Creating annotation from', item, position);

          manufacturedAnnotations.push({
            _id: item.id,
            body: {
              content: {
                title: item.bodyValue,
                description: item.bodyValue,
                relatedPerspective: {
                  preview: '',
                  cameraType: 'ArcRotateCamera',
                  target: firstSelector,
                  position,
                },
                type: 'text',
              },
              type: 'annotation',
            },
            created: new Date().toISOString(),
            generator: {
              type: 'software',
              name: 'Kompakkt',
              _id: 'kompakkt',
              homepage: 'https://github.com/Kompakkt/Kompakkt',
            },
            motivation: 'defaultMotivation',
            lastModifiedBy: {
              type: 'person',
              name: 'Kompakkt',
              _id: 'kompakkt',
            },
            creator: {
              type: 'person',
              name: 'Kompakkt',
              _id: 'kompakkt',
            },
            validated: true,
            ranking: i + 1,
            identifier: item.id,
            target: {
              source: {
                relatedEntity: 'standalone',
                relatedCompilation: '',
              },
              selector: {
                referenceNormal: position,
                referencePoint: firstSelector,
              },
            },
          } as IAnnotation);
        }
        this.standaloneAnnotations$.next(manufacturedAnnotations);
        console.log('AnnotationPage items', items);
      }
    };

    console.log('scene', scene);
    const rawSceneAnnotations = (scene as any)?.__jsonld?.annotations ?? [];
    const sceneContent = (scene as any)?.getContent ? (scene as any).getContent() : [];
    const rawSceneItems = (scene as any)?.__jsonld?.items ?? (scene as any)?.items ?? [];
    const rawSceneAnnotationPages = sceneContent.length
      ? []
      : rawSceneItems.filter((item: any) => item?.type === 'AnnotationPage');
    const annotations = [...sceneContent, ...rawSceneAnnotations, ...rawSceneAnnotationPages];
    for (const annotation of annotations ?? []) {
      await processAnnotation(annotation);
    }

    if (loadedMeshes.length) {
      if (hasExplicitLights) {
        this.babylon.getScene().environmentIntensity = 0;
        loadedMeshes.forEach(mesh => {
          if (mesh.material instanceof PBRMaterial) {
            mesh.material.environmentIntensity = 0;
          }
        });
      }

      const entity = {
        ...baseEntity(),
        _id: 'standalone_entity',
        name: 'IIIF Manifest',
        relatedDigitalEntity: { _id: 'standalone_entity' },
        settings: entitySettings,
        mediaType: 'model',
      } as IEntity;

      this.updateActiveEntity(entity, loadedMeshes);
      this.settings$.next({
        localSettings: entity.settings,
        serverSettings: entity.settings,
      });
    }

    // "Smart" automatic positioning of camera
    const automoveCamera = () => {
      if (!hasProcessedCamera) {
        const camera = this.babylon.getActiveCamera();

        const childMeshes = transformNodes.flatMap(node =>
          node.getChildMeshes(false).filter((m): m is Mesh => m instanceof Mesh),
        );
        const boundingInfo = childMeshes
          .map(m => m.getBoundingInfo().boundingBox)
          .filter(b => b.extendSizeWorld.asArray().some(v => v > 0))
          .map(b => ({
            center: b.centerWorld,
            extend: [...b.maximumWorld.asArray(), ...b.minimumWorld.asArray()].map(v =>
              Math.abs(v),
            ),
          }));

        const averageCenter = boundingInfo
          .reduce((acc, info) => acc.add(info.center), Vector3.Zero())
          .scale(1 / boundingInfo.length);

        const maxExtend = Math.max(...boundingInfo.flatMap(info => info.extend));

        this.babylon.cameraManager.setActiveCameraTarget(averageCenter);
        this.babylon.cameraManager.moveActiveCameraToPosition(
          new Vector3(Math.PI / 2, Math.PI / 2, maxExtend * 2.5),
        );
      }
    };

    console.log('Transform nodes from manifest:', transformNodes);

    this.loadingScreen.hide();
    this.bootstrapped$.next(true);

    setTimeout(() => {
      if (applyExplicitCamera) {
        applyExplicitCamera();
        setTimeout(applyExplicitCamera, 250);
        return;
      }
      automoveCamera();
    }, 0);
  }

  public importIIIF3DManifestJson(manifestJson: object) {
    return this.processIIIF3DManifest(manifestJson);
  }

  public importIIIF3DManifest(manifestUrl: string) {
    return this.loadIIIF3DManifest(manifestUrl);
  }

  private async loadStandaloneEntity(entries: IQueryParams) {
    const { settings, annotations } = entries;
    const manifestUrl = entries.manifest ?? entries.document;

    if (manifestUrl) {
      return this.loadIIIF3DManifest(manifestUrl);
    }

    const url = ((): string | undefined => {
      const { endpoint, resource } = entries;
      // If only endpoint or resource is set, use as is
      if (!endpoint && resource) {
        if (isBase64(resource)) {
          return decodeBase64(resource);
        }
        return resource;
      }
      if (endpoint && !resource) {
        if (isBase64(endpoint)) {
          return decodeBase64(endpoint);
        }
        return endpoint;
      }
      // If both are set, concatenate them as url
      if (endpoint && resource) {
        const stableEndpoint = decodeURIUntilStable(endpoint);
        const stableResource = decodeURIUntilStable(resource);
        return `${stableEndpoint}/${stableResource}`;
      }
      return undefined;
    })();

    if (!url) throw new Error('No endpoint or resource defined');
    console.log('URL', url);

    // Extract endpoint from url, so we can load settings and annotations
    // tslint:disable-next-line:newline-per-chained-call
    const endpoint = url.split('/').reverse().slice(1).reverse().join('/');

    const entity = {
      ...baseEntity(),
      _id: 'standalone_entity',
      name: 'Standalone Entity',
      relatedDigitalEntity: { _id: 'standalone_entity' },
      settings: minimalSettings,
    };

    const getResource = async <T extends unknown>(
      resource: string,
      parseJson = false,
    ): Promise<T | undefined> => {
      console.log('Attempting to load resource', resource);
      if (resource.startsWith('http://') || resource.startsWith('https://')) {
        console.log('Attempting to load remote resource', resource);
        const request = this.http.get<T>(resource);
        const loaded = await firstValueFrom(request);
        return loaded as T;
      }
      if (resource.endsWith('.json')) {
        const request = this.http.get<T>(`${endpoint}/${resource}`);
        const loaded = await firstValueFrom(request);
        return loaded as T;
      }
      if (isBase64(resource)) {
        const decoded = decodeBase64(resource);
        if (!decoded) return undefined;
        return parseJson ? (JSON.parse(decoded) as T) : (decoded as T);
      }
      return undefined;
    };

    if (settings) {
      console.log('Attempting to load settings', settings);
      const loadedSettings = await getResource<IEntitySettings>(settings, true);
      if (loadedSettings) {
        entity.settings = loadedSettings;
        console.log('Loaded settings', loadedSettings);
      }
    }

    if (annotations) {
      console.log('Attempting to load annotations', annotations);
      let loadedAnnotations = await getResource<IAnnotation[] | IIIFData | {}>(annotations, true);
      console.log('Loaded annotations', loadedAnnotations);
      if (loadedAnnotations) {
        if (isIIIFData(loadedAnnotations)) {
          loadedAnnotations = loadedAnnotations.annotations.map((anno, index) =>
            convertIIIFAnnotation(anno, index),
          );
        }

        if (Array.isArray(loadedAnnotations)) {
          const patchedAnnotations: { [id: string]: IAnnotation } = {};
          for (const anno of loadedAnnotations) patchedAnnotations[anno._id.toString()] = anno;
          console.log('Loaded annotations', patchedAnnotations);

          entity.annotations = patchedAnnotations;
        } else {
          console.log('Unknown annotations format', loadedAnnotations);
        }
      }
    }

    return this.babylon
      .loadEntity(true, url)
      .then(meshes => {
        this.updateActiveEntity(entity, meshes);
        this.settings$.next({
          localSettings: entity.settings,
          serverSettings: entity.settings,
        });
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to entity server to load entity refused.');
        this.loadFallbackEntity();
      })
      .then(() => {
        if (!!entries.minimal) {
          this.showAnnotationEditor$.next(false);
          this.showSettingsEditor$.next(false);
          this.showSidenav$.next(false);
        } else {
          this.showAnnotationEditor$.next(!annotations);
          this.showSettingsEditor$.next(!settings);
          const overlay = !settings ? 'settings' : !annotations ? 'annotation' : '';
          this.showSidenav$.next(!!overlay);
          this.overlay.toggleSidenav(overlay, !!overlay);
        }
        this.bootstrapped$.next(true);
      })
      .finally(() => {
        this.loadingScreen.hide();
      });
  }

  public loadDefaultEntityData() {
    this.updateEntityQuality('low');
    this.loadEntity(defaultEntity as IEntity, '');
  }

  public loadFallbackEntity() {
    this.updateEntityQuality('low');
    this.loadEntity(fallbackEntity as IEntity, '');
  }

  public fetchAndLoad(entityId?: string | null, compilationId?: string | null) {
    if (entityId && !compilationId) {
      this.fetchEntityData(entityId);
    }
    if (compilationId) {
      this.fetchCompilationData(compilationId, entityId ? entityId : undefined);
    }
  }

  private fetchCompilationData(id: string, specifiedEntity?: string, password?: string) {
    this.backend
      .getCompilation(id, password ?? undefined)
      .then(compilation => {
        if (compilation) {
          this.updateActiveCompilation(compilation as ICompilation);
          this.fetchEntityDataAfterCollection(compilation, specifiedEntity);
        } else {
          const dialogRef = this.dialog.open(DialogPasswordComponent, {
            disableClose: true,
            autoFocus: true,
            data: { id },
          });
          dialogRef
            .afterClosed()
            .subscribe(({ result, data }: { result: boolean; data: ICompilation }) => {
              if (result) {
                this.updateActiveCompilation(data);
                this.fetchEntityDataAfterCollection(data, specifiedEntity);
              } else {
                this.loadFallbackEntity();
                this.message.error('Sorry, you are not allowed to load this Collection.');
              }
            });
        }
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
  }

  private fetchEntityDataAfterCollection(compilation: ICompilation, specifiedEntity?: string) {
    const specified = specifiedEntity && compilation.entities[specifiedEntity.toString()];
    const entityToLoad = isEntity(specified) ? specified : Object.values(compilation.entities)[0];
    if (isEntity(entityToLoad)) this.fetchEntityData(entityToLoad._id);
  }

  public fetchEntityData(query: string) {
    this.backend
      .getEntity(query)
      .then(entity => {
        console.log('Received this Entity:', entity);

        // Force load the entity via query parameter, skipping any checks below.
        // Behaviour can be undefined this way, but was needed for:
        // https://gitlab.com/nfdi4culture/ta1-data-enrichment/kompakkt-viewer/-/issues/22
        const queryParams = new URLSearchParams(location.search);
        const entries = Object.fromEntries(queryParams.entries()) as { force?: string };

        if (entries.force) {
          console.log('Force loading entity');
          return this.loadEntity(entity);
        }

        // Check if this is an external file
        // This can fail if the external file is not available or not reachable
        const isExternal = !!entity.externalFile;
        if (isExternal) {
          console.log('Loading external file');
          return this.loadEntity(entity);
        }

        // Check if access is otherwise restricted
        const isRestricted = !entity.finished || !entity.online || entity.whitelist.enabled;
        console.log('Are access to this entity restricted', isRestricted);

        if (isRestricted) {
          console.log(this.fetchRestrictedEntityData, 'f');
        }

        this.loadEntity(entity);
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
  }

  private async fetchRestrictedEntityData(entity: IEntity) {
    this.userdata
      .userAuthentication(true)
      .then(auth => {
        console.log('fetchRestrictedEntityData', auth, entity);
        // Check for user authentication
        if (!auth) return false;
        // Check for ownership
        if (!this.userdata.doesUserOwn(entity)) {
          // Check for whitelist
          if (!entity.whitelist.enabled) return false;
          if (!this.userdata.isUserWhitelistedFor(entity)) return false;
        }
        return true;
      })
      .then(canUserAccess => {
        if (canUserAccess) {
          this.loadEntity(entity);
        } else {
          this.message.error('Sorry you are not allowed to load this object.');
          this.loadFallbackEntity();
        }
      });
  }

  public async loadEntity(newEntity: IEntity, overrideUrl?: string) {
    const mode = this.mode$.getValue();
    const baseURL = overrideUrl ?? environment.server_url;
    if (this.loadingScreen.isLoading() || !newEntity.processed || !newEntity.mediaType) {
      return;
    }

    if (newEntity.dataSource.isExternal) {
      this.entity$.next(newEntity);
      this.loadFallbackEntity();
      return;
    }

    const { mediaType } = newEntity;

    const isInUpload = await firstValueFrom(this.isInUpload$);
    if (isInUpload && (mode !== 'upload' || newEntity.finished)) {
      this.settings$.next({
        localSettings: minimalSettings,
        serverSettings: minimalSettings,
      });
      this.loadFallbackEntity();
      this.message.error('Object has no settings and cannot be loaded');
      return;
    }
    // cases: entity, image, audio, video, text
    const quality = this.quality$.getValue();
    const path: string = newEntity.externalFile ?? newEntity.processed[quality];
    const isAudio = mediaType === 'audio';
    const url = path.includes('http') || path.includes('https') ? path : `${baseURL}${path}`;
    const isDefault = newEntity._id === 'default';

    this.loadingScreen.show();
    this.babylon
      .loadEntity(
        true,
        isAudio ? 'assets/models/kompakkt.babylon' : url,
        isAudio ? 'model' : mediaType,
        isDefault,
      )
      .then(meshes => {
        if (isAudio) return this.babylon.loadEntity(false, url, mediaType);
        return meshes;
      })
      .then(meshes => {
        this.updateActiveEntity(newEntity, meshes);
      })
      .catch(error => {
        console.error('Failed to load entity from server', error);
        this.message.error('Failed to load entity from server');
        this.loadFallbackEntity();
      })
      .finally(() => {
        this.loadingScreen.hide();
      });
  }
}
