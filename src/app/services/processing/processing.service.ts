import { EventEmitter, Injectable, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Mesh, Quaternion } from 'babylonjs';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';

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
import {
  ICompilation,
  IEntity,
  IEntitySettings,
} from '../../interfaces/interfaces';
import { isEntityForCompilation } from '../../typeguards/typeguards';
import { BabylonService } from '../babylon/babylon.service';
import { LoadingscreenhandlerService } from '../babylon/loadingscreen';
import { MessageService } from '../message/message.service';
import { BackendService } from '../backend/backend.service';
import { OverlayService } from '../overlay/overlay.service';
import { UserdataService } from '../userdata/userdata.service';

@Injectable({
  providedIn: 'root',
})
export class ProcessingService {
  private Subjects = {
    actualEntity: new ReplaySubject<IEntity>(),
    actualEntityMeshes: new ReplaySubject<Mesh[]>(),
    actualCompilation: new ReplaySubject<ICompilation | undefined>(),
  };

  public Observables = {
    actualEntity: this.Subjects.actualEntity.asObservable(),
    actualEntityMeshes: this.Subjects.actualEntityMeshes.asObservable(),
    actualCompilation: this.Subjects.actualCompilation.asObservable(),
  };

  @Output() setSettings: EventEmitter<boolean> = new EventEmitter();
  @Output() loadAnnotations: EventEmitter<boolean> = new EventEmitter();
  @Output() initialiseEntityForAnnotating: EventEmitter<
    boolean
  > = new EventEmitter();
  public annotatingFeatured = false;
  public annotationAllowance = false;
  @Output() setAnnotationAllowance: EventEmitter<boolean> = new EventEmitter();

  // mediatype = 'model' || 'entity' || 'image' || 'audio' || 'video
  public actualEntityMediaType = '';

  // settings
  public actualEntitySettings: IEntitySettings | undefined;
  public actualEntitySettingsOnServer: IEntitySettings | undefined;
  public upload = false;
  public meshSettings = false;
  public actualRotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
  public actualEntityHeight = (0).toFixed(2);
  public actualEntityWidth = (0).toFixed(2);
  public actualEntityDepth = (0).toFixed(2);

  // loading
  public compilationLoaded = false;
  public defaultEntityLoaded = false;
  public fallbackEntityLoaded = false;
  public actualEntityQuality = 'low';
  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;

  // general features and modes
  // mode = '' || upload || explore || edit || annotation || open
  public mode = '';
  public showMenu = true;
  public showSidenav = true;
  public showAnnotationEditor = true;
  public showSettingsEditor = true;
  public showCompilationBrowser = false;

  constructor(
    private backend: BackendService,
    private message: MessageService,
    private overlayService: OverlayService,
    public babylonService: BabylonService,
    private loadingScreenHandler: LoadingscreenhandlerService,
    private userDataService: UserdataService,
    private dialog: MatDialog,
  ) {
    this.overlayService.sidenav.subscribe(() => {
      this.checkAnnotationAllowance();
    });
  }

  public getCurrentEntity(): IEntity | undefined {
    return this.Observables.actualEntity.source['_events'].slice(-1)[0];
  }

  public getCurrentCompilation(): ICompilation | undefined {
    return this.Observables.actualCompilation.source['_events'].slice(-1)[0];
  }

  public getCurrentEntityMeshes(): Mesh[] | undefined {
    return this.Observables.actualEntityMeshes.source['_events'].slice(-1)[0];
  }

  public updateActiveEntity(entity: IEntity) {
    console.log('New loaded Entity:', entity);
    this.Subjects.actualEntity.next(entity);
    if (entity && (entity._id === 'default' || entity._id === 'fallback')) {
      this.defaultEntityLoaded = entity._id === 'default';
      this.fallbackEntityLoaded = entity._id === 'fallback';
    }
    if (this.userDataService.userData) {
      this.userDataService.checkOwnerState(entity);
    }
    this.babylonService.getEngine().hideLoadingUI();
    this.babylonService.resize();

    // TODO load Annotations emit (Frage: nur, wenn !collection loaded?)
    this.loadAnnotations.emit(true);
  }

  public async updateActiveCompilation(compilation: ICompilation | undefined) {
    this.Subjects.actualCompilation.next(compilation);
    this.compilationLoaded = !!(compilation && compilation._id);
    this.showCompilationBrowser = this.compilationLoaded;
    if (this.userDataService.userData && this.compilationLoaded) {
      this.userDataService.checkOwnerState(compilation);
    }
    // TODO load annotations emit
  }

  public async updateActiveEntityMeshes(meshes: Mesh[], entity: IEntity) {
    this.annotatingFeatured = false;
    await this.setAnnotatingFeatured(entity);
    // TODO - move to babylon load: rendering groups
    meshes.forEach(mesh => (mesh.renderingGroupId = 2));
    this.babylonService
      .getScene()
      .getMeshesByTags('videoPlane', mesh => (mesh.renderingGroupId = 3));
    // End of TODO
    this.Subjects.actualEntityMeshes.next(meshes);
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
      await this.userDataService.userAuthentication(true);
    }

    if (mode === 'annotation' && !entityParam && !compParam) {
      await this.userDataService.userAuthentication(false).then(result => {
        if (!result) {
          this.userDataService.createTemporalUserData();
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
    if (!mode) {
      this.showMenu = false;
    }

    if (!mode || mode === 'open') {
      this.showSettingsEditor = false;
      this.showAnnotationEditor = false;
      if (!compParam) {
        this.showSidenav = false;
      }
    }

    if (mode !== 'annotation' && mode !== 'upload') {
      this.showAnnotationEditor = false;
    }

    // 4) toggle sidenav
    if (compParam && (!mode || mode === 'open')) {
      this.overlayService.toggleSidenav('compilationBrowser', true);
    }
    if (mode === 'annotation') {
      this.overlayService.toggleSidenav('annotation', true);
    }
    if (['edit', 'explore', 'upload'].includes(mode)) {
      this.overlayService.toggleSidenav('settings', true);
    }
    // TODO: error handling: wrong mode for loading
  }

  public loadDefaultEntityData() {
    this.actualEntityQuality = 'low';
    this.actualEntityMediaType = 'entity';
    this.loadEntity(defaultEntity, '');
  }

  public loadFallbackEntity() {
    this.actualEntityQuality = 'low';
    this.actualEntityMediaType = 'entity';
    this.loadEntity(fallbackEntity, '', '.gltf');
  }

  public fetchAndLoad(
    entityId?: string | null,
    compilationId?: string | null,
    isFromCompilation?: boolean,
  ) {
    this.actualEntityQuality = 'low';
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
    query: string,
    specifiedEntity?: string,
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
          dialogRef.afterClosed().subscribe(result => {
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

  private fetchEntityDataAfterCollection(compilation, specifiedEntity?) {
    if (specifiedEntity) {
      const loadEntity = compilation.entities.find(
        e => e && e._id === specifiedEntity,
      );
      if (loadEntity && isEntityForCompilation(loadEntity)) {
        this.fetchEntityData(loadEntity._id);
      } else {
        const entity = compilation.entities[0];
        if (isEntityForCompilation(entity)) this.fetchEntityData(entity._id);
      }
    } else {
      const entity = compilation.entities[0];
      if (isEntityForCompilation(entity)) this.fetchEntityData(entity._id);
    }
  }

  public fetchEntityData(query: string) {
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

  private fetchRestrictedEntityData(resultEntity) {
    this.userDataService.userAuthentication(true).then(auth => {
      if (auth) {
        if (this.userDataService.checkOwnerState(resultEntity)) {
          this.loadEntity(resultEntity);
        } else {
          if (
            resultEntity.whitelist.enabled &&
            this.userDataService.isUserWhitelisted(resultEntity)
          ) {
            this.loadEntity(resultEntity);
          } else {
            this.message.error(
              'Sorry you are not allowed to load this object.',
            );
            this.loadFallbackEntity();
          }
        }
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
        this.actualEntityMediaType = newEntity.mediaType;
        await this.initialiseActualEntitySettingsData(newEntity);
        if (this.upload && (this.mode !== 'upload' || newEntity.finished)) {
          this.actualEntitySettingsOnServer = undefined;
          this.actualEntitySettings = undefined;
          this.loadFallbackEntity();
          this.message.error(
            'I can not load this Object without Settings and not during upload.',
          );
        }
        // cases: entity, image, audio, video, text
        const _quality = newEntity.processed[this.actualEntityQuality];
        const _url =
          _quality.includes('http') || _quality.includes('https')
            ? _quality
            : `${URL}${_quality}`;
        extension = _url.slice(_url.lastIndexOf('.'));
        const mediaType = newEntity.mediaType;
        switch (newEntity.mediaType) {
          case 'model':
          case 'entity':
            await this.babylonService
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
                  this.babylonService.entityContainer.meshes as Mesh[],
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
            await this.babylonService
              .loadEntity(true, _url, mediaType)
              .then(() => {
                const plane = this.babylonService.imageContainer.plane;
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
            await this.babylonService
              .loadEntity(
                true,
                'assets/models/kompakkt.babylon',
                'model',
                '.babylon',
                true,
              )
              .then(() => {
                this.updateActiveEntityMeshes(
                  this.babylonService.entityContainer.meshes as Mesh[],
                  newEntity,
                );
                this.updateActiveEntity(newEntity);

                this.babylonService
                  .loadEntity(false, _url, mediaType)
                  .then(() => {});
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
            await this.babylonService
              .loadEntity(true, _url, mediaType)
              .then(() => {
                const plane = this.babylonService.videoContainer.plane;
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
        this.Subjects.actualEntity.next(newEntity);
        this.loadFallbackEntity();
        return;
      }
    }
  }

  private async initialiseActualEntitySettingsData(entity: IEntity) {
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
      this.actualEntitySettings = entity.settings;
      this.actualEntitySettingsOnServer = JSON.parse(
        JSON.stringify(entity.settings),
      );
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
      switch (this.actualEntityMediaType) {
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
    this.actualEntitySettings = settings;
    this.actualEntitySettingsOnServer = JSON.parse(JSON.stringify(settings));
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
        this.showAnnotationEditor = false;
      }
      return;
    }
    if (!this.compilationLoaded) {
      if (this.defaultEntityLoaded || this.fallbackEntityLoaded) {
        this.annotatingFeatured = true;
        return;
      }
      if (this.userDataService.userOwnsEntity) {
        this.annotatingFeatured = true;
        return;
      }
      const _userOwned = this.userDataService.checkOwnerState(entity);
      this.annotatingFeatured = _userOwned;
      if (!_userOwned && this.showAnnotationEditor) {
        this.showAnnotationEditor = false;
      }
      return;
    } else {
      const compilation = this.getCurrentCompilation();
      if (!compilation) {
        if (this.showAnnotationEditor) {
          this.showAnnotationEditor = false;
        }
        return;
      }
      if (
        !compilation.whitelist.enabled &&
        this.userDataService.authenticatedUser
      ) {
        this.annotatingFeatured = true;
        return;
      }
      if (compilation.whitelist.enabled) {
        if (this.userDataService.checkOwnerState(compilation)) {
          this.annotatingFeatured = true;
          return;
        }
        const _isUserWhitelisted = this.userDataService.isUserWhitelisted(
          compilation,
        );
        this.annotatingFeatured = _isUserWhitelisted;
        if (!_isUserWhitelisted && this.showAnnotationEditor) {
          this.showAnnotationEditor = false;
        }
        return;
      }
    }
  }

  private checkAnnotationAllowance() {
    const open = this.overlayService.sidenavIsOpen;
    if (!this.annotatingFeatured || this.upload) {
      return;
    }
    if (!open) {
      this.annotationAllowance = false;
      this.setAnnotationAllowance.emit(false);
    } else {
      if (
        this.overlayService.actualSidenavMode === 'annotation' &&
        (this.userDataService.userData || this.userDataService.guestUserData) &&
        !this.annotationAllowance
      ) {
        this.annotationAllowance = true;
        this.setAnnotationAllowance.emit(true);
      }
    }
  }
}
