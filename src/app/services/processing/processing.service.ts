import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AbstractMesh, Mesh, Quaternion, TransformNode, Vector3 } from '@babylonjs/core';
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
    const entries = Object.fromEntries(queryParams.entries()) as IQueryParams;

    const entityParam = entries['model'] ?? entries['entity'] ?? undefined;
    const compParam = entries['compilation'] ?? undefined;
    const qualityParam = entries['quality'] ?? 'low';
    if (isQualitySetting(qualityParam)) this.updateEntityQuality(qualityParam);
    // values = upload, explore, edit, annotation, open
    const mode = entries['mode'] ?? '';
    if (isMode(mode)) this.mode$.next(mode);

    // check if standalone and exit early to init standalone mode
    const isStandalone = !!entries['standalone'];
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
    const manifestJson = await fetch(decodeURIUntilStable(manifestUrl), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(res => res.json() as object)
      .catch(error => {
        console.log('Error loading manifest:', error);
        return undefined;
      });
    if (!manifestJson) {
      console.error('Manifest could not be loaded from URL', manifestUrl);
      return;
    }
    const manifest = parseManifest(manifestJson) as Manifest;

    const scenes = manifest?.getSequences()?.flatMap(seq => seq.getScenes());
    const scene = scenes?.at(0); // TODO: Allow scene selection
    console.log('loadIIIF3DManifest', manifest, scenes, scene);

    if (!scene) {
      console.warn('No scene found in manifest');
    }

    const entitySettings = minimalSettings;
    const setBackground = () => {
      const bgColor = scene?.getBackgroundColor();
      if (bgColor) {
        const color = {
          r: bgColor.red,
          g: bgColor.green,
          b: bgColor.blue,
          a: 1,
        };
        entitySettings.background = {
          color: color,
          effect: false,
        };
        console.log('background color', color);
        this.babylon.setBackgroundColor(color);
        this.babylon.setBackgroundImage(false);
        this.babylon.hideBackgroundHelpers();
      }
    };

    let hasProcessedCamera = false;

    const processBody = async (annotation: Annotation, body: AnnotationBody) => {
      console.log('json', annotation.__jsonld);

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
      const transformNode = new TransformNode(
        `transformNode-${entityUrl}`,
        this.babylon.getScene(),
      );
      meshes.filter(mesh => !mesh.parent).forEach(mesh => mesh.setParent(transformNode));

      const pointSelector = (() => {
        try {
          return annotation.getTarget()?.getSelector();
        } catch (error) {
          console.warn(`Failed getting point selector from annotation target`, error);
          return undefined;
        }
      })();
      transformNode.position.set(
        Number(pointSelector?.getProperty('x') ?? 0) * -1,
        Number(pointSelector?.getProperty('y') ?? 0),
        Number(pointSelector?.getProperty('z') ?? 0),
      );

      const transforms = (() => {
        try {
          return body.getTransform();
        } catch (error) {
          console.warn(`Failed getting transforms from annotation body`, error);
          return [];
        }
      })();
      for (const transform of transforms) {
        const vector = new Vector3(
          Number(transform?.getProperty('x') ?? 0) * -1,
          Number(transform?.getProperty('y') ?? 0),
          Number(transform?.getProperty('z') ?? 0),
        );
        if (transform.isScaleTransform) {
          transformNode.scaling = vector;
        }
        if (transform.isRotateTransform) {
          transformNode.rotation.addInPlace(vector);
        }
        if (transform.isTranslateTransform) {
          transformNode.position.addInPlace(vector);
        }
      }

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

      if (isBody(annotation)) {
        for await (const body of annotation.getBody()) {
          const transformNode = await processBody(annotation, body);
          if (transformNode) {
            transformNodes.push(transformNode);
          }
        }
      }

      const page = (() => {
        if (isCommentPage(annotation)) return annotation;
        if (annotation.__jsonld.bodyValue !== undefined) {
          const page = { items: [annotation.__jsonld] } as unknown as CommentPage;
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
    const annotations = [...(scene?.getContent() ?? []), ...(scene?.__jsonld['annotations'] ?? [])];
    await Promise.all(annotations?.map(annotation => processAnnotation(annotation)) ?? []);

    // "Smart" automatic positioning of camera
    const automoveCamera = () => {
      if (!hasProcessedCamera) {
        const camera = this.babylon.cameraManager.getActiveCamera();

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

        this.babylon.cameraManager.moveActiveCameraToPosition(
          new Vector3(camera.alpha * -1, camera.beta, maxExtend * 4),
        );
        this.babylon.cameraManager.setActiveCameraTarget(averageCenter);
      }
    };

    console.log('Transform nodes from manifest:', transformNodes);

    this.loadingScreen.hide();
    this.bootstrapped$.next(true);

    setTimeout(() => {
      automoveCamera();
      setBackground();
    }, 0);
  }

  private async loadStandaloneEntity(entries: IQueryParams) {
    const { settings, annotations, manifest: manifestUrl } = entries;

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
