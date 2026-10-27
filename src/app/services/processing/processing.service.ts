import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AbstractMesh, Quaternion } from '@babylonjs/core';
import { firstValueFrom } from 'rxjs';
import {
  IAnnotation,
  ICompilation,
  IEntity,
  IEntitySettings,
  isCompilation,
  isEntity,
} from '@kompakkt/common';
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
import { decodeBase64, decodeURIUntilStable, isBase64 } from '../../helpers';
import { IIIFData, convertIIIFAnnotation, isIIIFData } from '../../helpers/iiif-data-helper';
import { BabylonService } from '../babylon/babylon.service';
import { LoadingScreenService } from '../babylon/loadingscreen';
import { BackendService } from '../backend/backend.service';
import { MessageService } from '../message/message.service';
import { OverlayService } from '../overlay/overlay.service';
import { UserdataService } from '../userdata/userdata.service';
import { ActivatedRoute, ActivatedRouteSnapshot, ParamMap, Params, Router } from '@angular/router';

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
  resource?: string;
  minimal?: string;
  transparent?: string;
}
const isQueryParams = (params: unknown): params is IQueryParams => {
  return params !== undefined && typeof params === 'object' && !Array.isArray(params);
};

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

  public entity = signal<IEntity | undefined>(undefined);
  public meshes = signal<AbstractMesh[]>([]);
  public compilation = signal<ICompilation | undefined>(undefined);
  public compilationEntities = computed(() => {
    const compilation = this.compilation();
    return (Object.values(compilation?.entities ?? {}) ?? []).filter(isEntity);
  });

  public mode = signal<Mode>('');
  public localSettings = signal<IEntitySettings>(minimalSettings);
  public serverSettings = signal<IEntitySettings>(minimalSettings);
  public settings = computed(() => ({
    localSettings: this.localSettings(),
    serverSettings: this.serverSettings(),
  }));
  public quality = signal<QualitySetting>('low');

  public mediaType = computed(() => this.entity()?.mediaType);
  public isInUpload = computed(() => {
    const entity = this.entity();
    if (!entity) return false;
    return !areSettingsSet(entity);
  });
  public hasMeshSettings = computed(() => {
    const mediaType = this.mediaType();
    if (!mediaType) return false;
    return ['model', 'entity', 'cloud', 'splat', 'image'].includes(mediaType);
  });

  public isDefaultEntity = computed(() => this.entity()?._id === 'default');
  public isFallbackEntity = computed(() => this.entity()?._id === 'fallback');
  public isStandalone = computed(() => this.entity()?._id === 'standalone_entity');

  // general features and modes
  public showMenu = signal(true);
  public showSidenav = signal(true);
  public showAnnotationEditor = signal(true);
  public showSettingsEditor = signal(true);

  public showAnimationEditor = computed(() => {
    const container = this.babylon.containers.entity();
    const entity = this.entity();
    return (
      (container?.animationGroups.length ?? 0) > 0 &&
      (entity?.mediaType === 'entity' || entity?.mediaType === 'model') &&
      entity?._id !== 'default'
    );
  });

  public bootstrapped = signal(false);

  isOwner = computed(() => {
    const entity = this.entity();
    const compilation = this.compilation();
    const ofEntity = this.userdata.doesUserOwn(entity);
    const ofCompilation = this.userdata.doesUserOwn(compilation);
    return { ofEntity, ofCompilation };
  });

  doesUserHaveCompilationAccess = computed(() => {
    const compilation = this.compilation();
    if (!compilation) return false;
    return this.userdata.doesUserHaveAccess(compilation);
  });

  isAnnotatingFeatured = computed(() => {
    // Re-trigger on authentication state change
    const _isAuthenticated = this.userdata.isAuthenticated();

    const entity = this.entity();
    const compilation = this.compilation();
    const isCompilationLoaded = compilation !== undefined;
    const isDefault = this.isDefaultEntity();
    const isFallback = this.isFallbackEntity();
    const showEditor = this.showAnnotationEditor();
    const isStandalone = this.isStandalone();
    const mode = this.mode();

    const isOwner = this.isOwner();
    const doesUserHaveCompilationAccess = this.doesUserHaveCompilationAccess();

    if (!entity) return false;
    if (isStandalone) return true;

    // TODO: Implement annotation for every type, then we don't need this check
    const isAnnotatable =
      entity.mediaType === 'image' ||
      entity.mediaType === 'entity' ||
      entity.mediaType === 'cloud' ||
      entity.mediaType === 'splat' ||
      entity.mediaType === 'model';

    const hideEditor = !showEditor || !isAnnotatable || isFallback;
    const shouldHideEditor = !isAnnotatable || isFallback;
    const isEditorVisible = showEditor && !isCompilationLoaded;

    if (hideEditor && shouldHideEditor && isEditorVisible) return false;

    if (isCompilationLoaded) {
      if (!compilation) return false;
      return doesUserHaveCompilationAccess || isOwner.ofCompilation;
    } else {
      if ((isDefault || isFallback) && mode === 'annotation') return true;
      if (isOwner.ofEntity) return true;
    }
    return false;
  });

  hasAnnotationAllowance = computed(() => {
    const isStandalone = this.isStandalone();
    const isInUpload = this.isInUpload();
    const isAnnotatingFeatured = this.isAnnotatingFeatured();
    const isAuthenticated = this.userdata.isAuthenticated();
    const sidenavMode = this.overlay.sidenav().mode;
    if (isInUpload) return false;
    if (!isAnnotatingFeatured) return false;
    if (isStandalone) return true;
    if (sidenavMode === 'annotation' && isAuthenticated) return true;
    return false;
  });

  state = computed(() => {
    return {
      entity: this.entity(),
      settings: this.settings().localSettings,
      meshes: this.meshes(),
      compilation: this.compilation(),
    };
  });

  constructor() {
    effect(() => {
      const entity = this.entity();
      const isDefault = this.isDefaultEntity();
      if (!entity) return;
      this.handleEntitySettings(entity);
      if (isDefault) this.babylon.setOrbitGizmoVisible(false);
    });
  }

  private handleEntitySettings(entity: IEntity) {
    if (areSettingsSet(entity)) {
      this.localSettings.set(entity.settings);
      this.serverSettings.set(entity.settings);
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
      this.localSettings.set(settings);
      this.serverSettings.set(settings);
    }
  }

  public updateEntityQuality(quality: QualitySetting) {
    this.quality.set(quality);
  }

  public updateActiveEntity(entity: IEntity | undefined, meshes: AbstractMesh[]) {
    console.log('New loaded Entity:', { entity, meshes });
    this.entity.set(entity);

    const isPickableMode = ['upload', 'annotation'].includes(this.mode());
    meshes.forEach(mesh => {
      mesh.isPickable = isPickableMode;
    });
    this.babylon
      .getScene()
      .getMeshesByTags('videoPlane')
      .forEach(mesh => {
        mesh.renderingGroupId = 3;
      });
    this.meshes.set(meshes);
    this.babylon.resize();
  }

  public async bootstrap(params: Params) {
    if (!isQueryParams(params)) {
      throw new Error('Invalid query params');
    }
    console.log('[Processing] Param entries', params);

    const entityParam = params['model'] ?? params['entity'] ?? undefined;
    const compParam = params['compilation'] ?? undefined;
    const qualityParam = params['quality'] ?? 'low';
    if (isQualitySetting(qualityParam)) this.updateEntityQuality(qualityParam);
    // values = upload, explore, edit, annotation, open
    const mode = params['mode'] ?? '';
    if (isMode(mode)) this.mode.set(mode);

    // check if standalone and exit early to init standalone mode
    const isStandalone = !!params['standalone'];
    if (isStandalone) return this.loadStandaloneEntity(params);

    if (params.transparent) this.babylon.isTransparent.set(true);

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
      void this.fetchAndLoad(entityParam, compParam);
    } else {
      void this.loadDefaultEntityData();
    }

    // 2) check modes
    this.showMenu.set(!!mode);

    // Default
    let showAnnotationEditor = true;
    let showSettingsEditor = true;

    if (!mode || mode === 'open') {
      showAnnotationEditor = false;
      showSettingsEditor = false;
      if (!compParam) {
        this.showSidenav.set(false);
      }
    }

    if (mode !== 'annotation' && mode !== 'upload') {
      showAnnotationEditor = false;
    }

    this.showAnnotationEditor.set(showAnnotationEditor);
    this.showSettingsEditor.set(showSettingsEditor);

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

    this.bootstrapped.set(true);
  }

  private async loadStandaloneEntity(entries: IQueryParams) {
    const { settings, annotations } = entries;

    console.log('loadStandaloneEntity', entries);

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
        this.localSettings.set(entity.settings);
        this.serverSettings.set(entity.settings);
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to entity server to load entity refused.');
        return this.loadFallbackEntity();
      })
      .then(() => {
        if (!!entries.minimal) {
          this.showAnnotationEditor.set(false);
          this.showSettingsEditor.set(false);
          this.showSidenav.set(false);
        } else {
          this.showAnnotationEditor.set(!annotations);
          this.showSettingsEditor.set(!settings);
          const overlay = !settings ? 'settings' : !annotations ? 'annotation' : '';
          this.showSidenav.set(!!overlay);
          this.overlay.toggleSidenav(overlay, !!overlay);
        }
        this.bootstrapped.set(true);
      });
  }

  public async loadDefaultEntityData() {
    this.updateEntityQuality('low');
    return this.loadEntity(defaultEntity as IEntity, '').then(meshes => {
      if (!meshes) return;
      const queryParams = new URLSearchParams(location.search);
      if (queryParams.get('transparent')) {
        this.babylon.addDefaultShadowGenerator(meshes);
      }
    });
  }

  public async loadFallbackEntity() {
    this.updateEntityQuality('low');
    return this.loadEntity(fallbackEntity as IEntity, '');
  }

  public async fetchAndLoad(entityId?: string | null, compilationId?: string | null) {
    if (entityId && !compilationId) {
      return this.fetchEntityData(entityId);
    }
    if (compilationId) {
      return this.fetchCompilationData(compilationId, entityId ? entityId : undefined);
    }
  }

  private async fetchCompilationData(id: string, specifiedEntity?: string) {
    return this.backend
      .getCompilation(id)
      .then(async compilation => {
        if (!compilation) {
          throw new Error('Compilation not found');
        }

        const isRestricted = typeof compilation.online === 'boolean' && !compilation.online;
        if (isRestricted) {
          const auth = await this.userdata.userAuthentication(true);
          console.log('isRestricted auth check', auth, document);
          if (!auth) {
            this.message.error('You need to be logged in to access this collection.');
            throw new Error('User authentication failed');
          }
          if (!this.userdata.doesUserOwn(compilation)) {
            if (!this.userdata.doesUserHaveAccess(compilation)) {
              this.message.error('Sorry, you are not allowed to load this collection.');
              throw new Error('User does not have access to this compilation');
            }
          }
        }

        if (!isCompilation(compilation)) {
          throw new Error('Compilation is not valid');
        }
        this.compilation.set(compilation);
        return this.fetchEntityDataAfterCollection(compilation, specifiedEntity);
      })
      .catch(error => {
        this.message.error('Error loading collection.');
        console.error(error);
        return this.loadFallbackEntity();
      });
  }

  private async fetchEntityDataAfterCollection(
    compilation: ICompilation,
    specifiedEntity?: string,
  ) {
    const specified = specifiedEntity && compilation.entities[specifiedEntity.toString()];
    const entityToLoad = isEntity(specified) ? specified : Object.values(compilation.entities)[0];
    if (isEntity(entityToLoad)) return this.fetchEntityData(entityToLoad._id);
  }

  public async fetchEntityData(query: string) {
    return this.backend
      .getEntity(query)
      .then(async entity => {
        if (!entity) throw new Error('Entity not found');

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
        const isExternal =
          'externalFile' in entity &&
          typeof entity.externalFile === 'string' &&
          entity.externalFile.length > 0;
        if (isExternal) {
          console.log('Loading external file');
          return this.loadEntity(entity);
        }

        // Check if access is otherwise restricted
        const isRestricted = !entity.finished || !entity.online;
        console.log('Are access to this entity restricted', isRestricted);

        if (isRestricted) {
          const auth = await this.userdata.userAuthentication(true);
          console.log('isRestricted auth check', auth, document);
          if (!auth) {
            this.message.error('You need to be logged in to access this entity.');
            throw new Error('User authentication failed');
          }
          if (!this.userdata.doesUserOwn(entity)) {
            if (!this.userdata.doesUserHaveAccess(entity)) {
              this.message.error('Sorry, you are not allowed to load this object.');
              throw new Error('User does not have access to this entity');
            }
          }
        }

        return this.loadEntity(entity);
      })
      .catch(error => {
        console.error(error);
        return this.loadFallbackEntity();
      });
  }

  public async loadEntity(
    newEntity: IEntity,
    overrideUrl?: string,
  ): Promise<AbstractMesh[] | undefined> {
    const mode = this.mode();
    const baseURL = overrideUrl ?? environment.server_url;
    if (this.loadingScreen.isLoading() || !newEntity.processed || !newEntity.mediaType) {
      return;
    }

    if (newEntity.dataSource.isExternal) {
      this.entity.set(newEntity);
      return this.loadFallbackEntity();
    }

    const { mediaType } = newEntity;

    if (this.isInUpload() && (mode !== 'upload' || newEntity.finished)) {
      this.localSettings.set(minimalSettings);
      this.serverSettings.set(minimalSettings);
      this.message.error('Object has no settings and cannot be loaded');
      return this.loadFallbackEntity();
    }
    // cases: entity, image, audio, video, text
    const quality = this.quality();
    const path: string = newEntity.externalFile ?? newEntity.processed[quality];
    const isAudio = mediaType === 'audio';
    const url = path.includes('http') || path.includes('https') ? path : `${baseURL}${path}`;
    const isDefault = newEntity._id === 'default';

    this.loadingScreen.show();
    return this.babylon
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
        return meshes;
      })
      .catch(error => {
        console.error('Failed to load entity from server', error);
        this.message.error('Failed to load entity from server');
        return this.loadFallbackEntity();
      });
  }
}
