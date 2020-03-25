import { EventEmitter, Injectable, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  ICompilation,
  IEntity,
  IEntitySettings,
  isEntity,
  ObjectId,
} from '@kompakkt/shared';
import { Mesh, Quaternion } from 'babylonjs';
import { BehaviorSubject } from 'rxjs';

import {
  defaultEntity,
  fallbackEntity,
} from '../../../assets/entities/entities';
import {
  settings2D,
  settingsAudio,
  settingsEntity,
  settingsFallback,
  settingsKompakktLogo,
} from '../../../assets/settings/settings';
import { environment } from '../../../environments/environment';
// tslint:disable-next-line:max-line-length
import { DialogPasswordComponent } from '../../components/dialogs/dialog-password/dialog-password.component';
import { BabylonService } from '../babylon/babylon.service';
import { LoadingscreenhandlerService } from '../babylon/loadingscreen';
import { BackendService } from '../backend/backend.service';
import { MessageService } from '../message/message.service';
import { OverlayService } from '../overlay/overlay.service';
import { UserdataService } from '../userdata/userdata.service';

@Injectable({
  providedIn: 'root',
})
export class ProcessingService {
  private _currentEntity: IEntity | undefined;
  private _currentEntityMeshes: Mesh[] | undefined;
  private _currentCompilation: ICompilation | undefined;
  private entity = new BehaviorSubject<IEntity | undefined>(undefined);
  private entityMeshes = new BehaviorSubject<Mesh[]>([]);
  private compilation = new BehaviorSubject<ICompilation | undefined>(
    undefined,
  );
  public entity$ = this.entity.asObservable();
  public meshes$ = this.entityMeshes.asObservable();
  public compilation$ = this.compilation.asObservable();

  @Output() setSettings = new EventEmitter<boolean>();
  @Output() loadAnnotations = new EventEmitter<boolean>();
  @Output() initialiseEntityForAnnotating = new EventEmitter<boolean>();
  public annotatingFeatured = false;
  public annotationAllowance = false;
  @Output() setAnnotationAllowance = new EventEmitter<boolean>();

  // mediatype = 'model' || 'entity' || 'image' || 'audio' || 'video
  public entityMediaType = '';

  // settings
  public entitySettings: IEntitySettings | undefined;
  public entitySettingsOnServer: IEntitySettings | undefined;
  public upload = false;
  public meshSettings = false;
  public rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
  public entityHeight = (0).toFixed(2);
  public entityWidth = (0).toFixed(2);
  public entityDepth = (0).toFixed(2);

  // loading
  public compilationLoaded = false;
  public defaultEntityLoaded = false;
  public fallbackEntityLoaded = false;
  public entityQuality = 'low';
  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;

  // general features and modes
  // mode = '' || upload || explore || edit || annotation || open
  public mode = '';
  private showMenu = new BehaviorSubject(true);
  private showSidenav = new BehaviorSubject(true);
  private showAnnotationEditor = new BehaviorSubject(true);
  private showSettingsEditor = new BehaviorSubject(true);
  private showCompilationBrowser = new BehaviorSubject(false);
  public showMenu$ = this.showMenu.asObservable();
  public showSidenav$ = this.showSidenav.asObservable();
  public showAnnotationEditor$ = this.showAnnotationEditor.asObservable();
  public showSettingsEditor$ = this.showSettingsEditor.asObservable();
  public showCompilationBrowser$ = this.showCompilationBrowser.asObservable();

  private bootstrapped = new BehaviorSubject(false);
  public bootstrapped$ = this.bootstrapped.asObservable();

  private sidenavMode = '';
  private sidenavOpen = false;

  constructor(
    private backend: BackendService,
    private message: MessageService,
    private overlay: OverlayService,
    public babylon: BabylonService,
    private loadingScreenHandler: LoadingscreenhandlerService,
    private userdata: UserdataService,
    private dialog: MatDialog,
  ) {
    this.overlay.sidenav$.subscribe(isOpen => {
      this.sidenavOpen = isOpen;
      this.checkAnnotationAllowance();
    });
    this.overlay.sidenavMode$.subscribe(mode => (this.sidenavMode = mode));
  }

  public updateActiveEntity(entity: IEntity | undefined) {
    console.log('New loaded Entity:', entity);
    this._currentEntity = entity;
    this.entity.next(this._currentEntity);
    if (entity?._id === 'default' || entity?._id === 'fallback') {
      this.defaultEntityLoaded = entity._id === 'default';
      this.fallbackEntityLoaded = entity._id === 'fallback';
    }
    if (this.userdata.userData) {
      this.userdata.checkOwnerState(entity);
    }
    this.babylon.getEngine().hideLoadingUI();
    this.babylon.resize();

    // TODO load Annotations emit (Frage: nur, wenn !collection loaded?)
    this.loadAnnotations.emit(true);
  }

  public async updateActiveCompilation(compilation: ICompilation | undefined) {
    this._currentCompilation = compilation;
    this.compilation.next(this._currentCompilation);
    this.compilationLoaded = !!(compilation && compilation._id);
    this.showCompilationBrowser.next(this.compilationLoaded);
    if (this.userdata.userData && this.compilationLoaded) {
      this.userdata.checkOwnerState(compilation);
    }
    // TODO load annotations emit
  }

  public async updateActiveEntityMeshes(meshes: Mesh[], entity: IEntity) {
    this.annotatingFeatured = false;
    await this.setAnnotatingFeatured(entity);
    // TODO - move to babylon load: rendering groups
    meshes.forEach(mesh => (mesh.renderingGroupId = 2));
    this.babylon
      .getScene()
      .getMeshesByTags('videoPlane', mesh => (mesh.renderingGroupId = 3));
    // End of TODO
    this._currentEntityMeshes = meshes;
    this.entityMeshes.next(this._currentEntityMeshes);
    this.setSettings.emit(true);
    if (this.annotatingFeatured) this.initialiseEntityForAnnotating.emit(true);
    this.checkAnnotationAllowance();
  }

  public async bootstrap() {
    const searchParams = location.search;
    const queryParams = new URLSearchParams(searchParams);
    const entityParam =
      queryParams.get('model') || queryParams.get('entity') || undefined;
    const compParam = queryParams.get('compilation') || undefined;
    // values = upload, explore, edit, annotation, open
    const mode = queryParams.get('mode') || '';
    this.mode = mode;

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
      await this.userdata.userAuthentication(false).then(result => {
        if (!result) {
          this.userdata.createTemporalUserData();
        }
      });
    }

    // 3) Load Entity and compilation
    if (compParam || entityParam) {
      this.fetchAndLoad(entityParam, compParam, compParam !== undefined);
    } else {
      this.loadDefaultEntityData();
    }

    // 2) check modes
    this.showMenu.next(!!mode);

    // Default
    let showAnnotationEditor = true;
    let showSettingsEditor = true;

    if (!mode || mode === 'open') {
      showAnnotationEditor = false;
      showSettingsEditor = false;
      if (!compParam) {
        this.showSidenav.next(false);
      }
    }

    if (mode !== 'annotation' && mode !== 'upload') {
      showAnnotationEditor = false;
    }

    this.showAnnotationEditor.next(showAnnotationEditor);
    this.showSettingsEditor.next(showSettingsEditor);

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

    this.bootstrapped.next(true);
  }

  public loadDefaultEntityData() {
    this.entityQuality = 'low';
    this.entityMediaType = 'entity';
    this.loadEntity(defaultEntity as IEntity, '');
  }

  public loadFallbackEntity() {
    this.entityQuality = 'low';
    this.entityMediaType = 'entity';
    this.loadEntity(fallbackEntity as IEntity, '', '.gltf');
  }

  public fetchAndLoad(
    entityId?: string | ObjectId | null,
    compilationId?: string | ObjectId | null,
    isFromCompilation?: boolean,
  ) {
    this.entityQuality = 'low';
    if (!compilationId && !isFromCompilation) {
      this.compilationLoaded = false;
      this.updateActiveCompilation(undefined);
    }
    if (entityId && !compilationId) {
      this.fetchEntityData(entityId);
    }
    if (compilationId) {
      this.fetchCompilationData(compilationId, entityId ? entityId : undefined);
    }
  }

  private fetchCompilationData(
    query: string | ObjectId,
    specifiedEntity?: string | ObjectId,
    password?: string,
  ) {
    this.backend
      .getCompilation(query, password ? password : undefined)
      .then(compilation => {
        if (!compilation) {
          const dialogRef = this.dialog.open(DialogPasswordComponent, {
            disableClose: true,
            autoFocus: true,
            data: {
              id: query,
            },
          });
          dialogRef
            .afterClosed()
            .subscribe((result: { result: boolean; data: ICompilation }) => {
              if (result) {
                const newData = result.data;
                this.updateActiveCompilation(newData);
                this.fetchEntityDataAfterCollection(
                  newData,
                  specifiedEntity ? specifiedEntity : undefined,
                );
              } else {
                this.loadFallbackEntity();
                this.message.error(
                  'Sorry, you are not allowed to load this Collection.',
                );
              }
            });
        } else {
          this.updateActiveCompilation(compilation as ICompilation);
          this.fetchEntityDataAfterCollection(
            compilation,
            specifiedEntity ? specifiedEntity : undefined,
          );
        }
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
  }

  private fetchEntityDataAfterCollection(
    compilation: ICompilation,
    specifiedEntity?: string | ObjectId,
  ) {
    if (specifiedEntity) {
      const loadEntity = compilation.entities[specifiedEntity.toString()];
      if (loadEntity && isEntity(loadEntity)) {
        this.fetchEntityData(loadEntity._id);
      } else {
        const entity = Object.values(compilation.entities)[0];
        if (isEntity(entity)) this.fetchEntityData(entity._id);
      }
    } else {
      const entity = Object.values(compilation.entities)[0];
      if (isEntity(entity)) this.fetchEntityData(entity._id);
    }
  }

  public fetchEntityData(query: string | ObjectId) {
    this.backend
      .getEntity(query)
      .then(resultEntity => {
        console.log('Received this Entity:', resultEntity);

        if (
          !resultEntity.finished ||
          !resultEntity.online ||
          resultEntity.whitelist.enabled
        ) {
          this.fetchRestrictedEntityData(resultEntity);
        } else {
          this.loadEntity(resultEntity);
        }
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
  }

  private fetchRestrictedEntityData(resultEntity: IEntity) {
    this.userdata
      .userAuthentication(true)
      .then(auth => {
        // Check for user authentication
        if (!auth) return false;
        // Check for ownership
        if (!this.userdata.checkOwnerState(resultEntity)) {
          // Check for whitelist
          if (!resultEntity.whitelist.enabled) return false;
          if (!this.userdata.isUserWhitelisted(resultEntity)) return false;
        }
        return true;
      })
      .then(canUserAccess => {
        if (canUserAccess) {
          this.loadEntity(resultEntity);
        } else {
          this.message.error('Sorry you are not allowed to load this object.');
          this.loadFallbackEntity();
        }
      });
  }

  public async loadEntity(
    newEntity: IEntity,
    overrideUrl?: string,
    extension = '.babylon',
  ) {
    const URL = overrideUrl !== undefined ? overrideUrl : this.baseUrl;
    if (
      !this.loadingScreenHandler.isLoading &&
      newEntity.processed &&
      newEntity.mediaType
    ) {
      if (!newEntity.dataSource.isExternal) {
        this.entityMediaType = newEntity.mediaType;
        await this.initialiseEntitySettingsData(newEntity);
        if (this.upload && (this.mode !== 'upload' || newEntity.finished)) {
          this.entitySettingsOnServer = undefined;
          this.entitySettings = undefined;
          this.loadFallbackEntity();
          this.message.error(
            'I can not load this Object without Settings and not during upload.',
          );
        }
        // cases: entity, image, audio, video, text
        const _quality = (newEntity.processed as any)[this.entityQuality];
        const _url =
          _quality.includes('http') || _quality.includes('https')
            ? _quality
            : `${URL}${_quality}`;
        extension = _url.slice(_url.lastIndexOf('.'));
        const mediaType = newEntity.mediaType;
        switch (newEntity.mediaType) {
          case 'model':
          case 'entity':
            await this.babylon
              .loadEntity(
                true,
                _url,
                mediaType,
                extension,
                newEntity._id === 'default',
              )
              .then(() => {
                this.updateActiveEntity(newEntity);
                this.updateActiveEntityMeshes(
                  this.babylon.entityContainer.meshes as Mesh[],
                  newEntity,
                );
              })
              .catch(error => {
                console.error(error);
                this.message.error(
                  'Connection to entity server to load entity refused.',
                );
                this.loadFallbackEntity();
              });
            break;
          case 'image':
            await this.babylon
              .loadEntity(true, _url, mediaType)
              .then(() => {
                const plane = this.babylon.imageContainer.plane;
                if (plane) {
                  this.updateActiveEntity(newEntity);
                  this.updateActiveEntityMeshes([plane as Mesh], newEntity);
                }
              })
              .catch(error => {
                console.error(error);
                this.message.error(
                  'Connection to entity server to load entity refused.',
                );
                this.loadFallbackEntity();
              });
            break;
          case 'audio':
            await this.babylon
              .loadEntity(
                true,
                'assets/models/kompakkt.babylon',
                'model',
                '.babylon',
                true,
              )
              .then(() => {
                this.updateActiveEntityMeshes(
                  this.babylon.entityContainer.meshes as Mesh[],
                  newEntity,
                );
                this.updateActiveEntity(newEntity);

                this.babylon.loadEntity(false, _url, mediaType).then(() => {});
              })
              .catch(error => {
                console.error(error);
                this.message.error(
                  'Connection to entity server to load entity refused.',
                );
                this.loadFallbackEntity();
              });
            break;
          case 'video':
            await this.babylon
              .loadEntity(true, _url, mediaType)
              .then(() => {
                const plane = this.babylon.videoContainer.plane;
                if (plane) {
                  this.updateActiveEntity(newEntity);
                  this.updateActiveEntityMeshes([plane as Mesh], newEntity);
                }
              })
              .catch(error => {
                console.error(error);
                this.message.error(
                  'Connection to entity server to load entity refused.',
                );
                this.loadFallbackEntity();
              });
            break;
          default:
            this.loadFallbackEntity();
        }
      } else {
        this.entity.next(newEntity);
        this.loadFallbackEntity();
        return;
      }
    }
  }

  private async initialiseEntitySettingsData(entity: IEntity) {
    const mediaType = entity.mediaType;
    if (
      mediaType === 'model' ||
      mediaType === 'entity' ||
      mediaType === 'image'
    ) {
      this.meshSettings = true;
    }

    let upload = false;
    const settings = entity.settings;

    if (
      !settings ||
      settings.preview === undefined ||
      // TODO: how to check if settings need to be set? atm next line
      settings.preview === '' ||
      settings.cameraPositionInitial === undefined ||
      settings.background === undefined ||
      settings.lights === undefined ||
      settings.rotation === undefined ||
      settings.scale === undefined
    ) {
      upload = await this.createSettings();
      this.upload = upload;
    } else {
      this.upload = false;
      this.entitySettings = entity.settings;
      this.entitySettingsOnServer = JSON.parse(JSON.stringify(entity.settings));
    }
  }

  private createSettings(): boolean {
    let settings;
    let upload = false;

    if (this.defaultEntityLoaded) {
      settings = settingsKompakktLogo;
    } else if (this.fallbackEntityLoaded) {
      settings = settingsFallback;
    } else {
      switch (this.entityMediaType) {
        case 'entity':
        case 'model': {
          settings = settingsEntity;
          break;
        }
        case 'audio': {
          settings = settingsAudio;
          break;
        }
        case 'video': {
          settings = settings2D;
          break;
        }
        case 'image': {
          settings = settings2D;
          break;
        }
        default: {
          settings = settingsEntity;
        }
      }
      upload = true;
    }
    this.entitySettings = settings;
    this.entitySettingsOnServer = JSON.parse(JSON.stringify(settings));
    return upload;
  }

  // inititalize Annotation Mode
  private async setAnnotatingFeatured(entity: IEntity) {
    const annotatableMediaType =
      entity.mediaType === 'image' ||
      entity.mediaType === 'entity' ||
      entity.mediaType === 'model';
    if (
      !this.showAnnotationEditor ||
      !annotatableMediaType ||
      this.fallbackEntityLoaded
    ) {
      if (
        (!annotatableMediaType || this.fallbackEntityLoaded) &&
        this.showAnnotationEditor &&
        !this.compilationLoaded
      ) {
        this.showAnnotationEditor.next(false);
      }
      return;
    }
    if (!this.compilationLoaded) {
      if (this.defaultEntityLoaded || this.fallbackEntityLoaded) {
        this.annotatingFeatured = true;
        return;
      }
      if (this.userdata.userOwnsEntity) {
        this.annotatingFeatured = true;
        return;
      }
      const _userOwned = this.userdata.checkOwnerState(entity);
      this.annotatingFeatured = _userOwned;
      if (!_userOwned && this.showAnnotationEditor) {
        this.showAnnotationEditor.next(false);
      }
      return;
    } else {
      const compilation = this._currentCompilation;
      if (!compilation) {
        if (this.showAnnotationEditor) {
          this.showAnnotationEditor.next(false);
        }
        return;
      }
      if (!compilation.whitelist.enabled && this.userdata.authenticatedUser) {
        this.annotatingFeatured = true;
        return;
      }
      if (compilation.whitelist.enabled) {
        if (this.userdata.checkOwnerState(compilation)) {
          this.annotatingFeatured = true;
          return;
        }
        const _isUserWhitelisted = this.userdata.isUserWhitelisted(compilation);
        this.annotatingFeatured = _isUserWhitelisted;
        if (!_isUserWhitelisted && this.showAnnotationEditor) {
          this.showAnnotationEditor.next(false);
        }
        return;
      }
    }
  }

  private checkAnnotationAllowance() {
    if (!this.annotatingFeatured || this.upload) {
      return;
    }
    if (!this.sidenavOpen) {
      this.annotationAllowance = false;
      this.setAnnotationAllowance.emit(false);
    } else {
      const user = this.userdata.userData || this.userdata.guestUserData;
      if (this.sidenavMode === 'annotation' && user) {
        this.annotationAllowance = true;
        this.setAnnotationAllowance.emit(true);
      }
    }
  }
}
