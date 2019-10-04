import { EventEmitter, Injectable, Output } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
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
import { MongohandlerService } from '../mongohandler/mongohandler.service';
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
  public annotatingFeatured = false;

  constructor(
    private mongoHandlerService: MongohandlerService,
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
    } else {
      this.defaultEntityLoaded = false;
      this.defaultEntityLoaded = false;
    }
    // TODO load Annotations emit (Frage: nur, wenn !collection loaded?)
    this.loadAnnotations.emit(true);
  }

  public async updateActiveCompilation(compilation: ICompilation | undefined) {
    this.Subjects.actualCompilation.next(compilation);
    this.compilationLoaded = !!(compilation && compilation._id);
    this.showCompilationBrowser = this.compilationLoaded;
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
    const entityParam = queryParams.get('model') || queryParams.get('entity');
    const compParam = queryParams.get('compilation');
    // values = upload, explore, edit, annotation, open
    const mode = queryParams.get('mode');
    this.mode = mode ? mode : '';

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
    if (compParam) {
      this.fetchAndLoad(entityParam ? entityParam : undefined, compParam, true);
    }
    if (!compParam && entityParam) {
      this.fetchAndLoad(entityParam, undefined, false);
    }
    if (!compParam && !entityParam) {
      this.loadDefaultEntityData();
    }

    // 2) check modes
    if (!mode) {
      this.showMenu = false;
    }

    if ((!mode && compParam) || (mode === 'open' && compParam)) {
      this.showSettingsEditor = false;
      this.showAnnotationEditor = false;
    }

    if ((!mode && !compParam) || (!compParam && mode === 'open')) {
      this.showSidenav = false;
      this.showSettingsEditor = false;
      this.showAnnotationEditor = false;
    }

    if (mode !== 'annotation' && mode !== 'upload') {
      this.showAnnotationEditor = false;
    }

    // 4) toggle sidenav
    if ((!mode && compParam) || (mode === 'open' && compParam)) {
      this.overlayService.toggleSidenav('compilationBrowser', true);
    }
    if (mode === 'annotation') {
      this.overlayService.toggleSidenav('annotation', true);
    }
    if (mode === 'edit' || mode === 'explore' || mode === 'upload') {
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
    this.mongoHandlerService
      .getCompilation(query, password ? password : undefined)
      .then(compilation => {
        if (compilation['_id']) {
          this.updateActiveCompilation(compilation);
          this.loadEntityAfterCollection(
            compilation,
            specifiedEntity ? specifiedEntity : undefined,
          );
        } else if (
          compilation['status'] === 'ok' &&
          compilation['message'] === 'Password protected compilation'
        ) {
          const dialogConfig = new MatDialogConfig();
          dialogConfig.disableClose = true;
          dialogConfig.autoFocus = true;
          dialogConfig.data = {
            id: query,
          };
          const dialogRef = this.dialog.open(
            DialogPasswordComponent,
            dialogConfig,
          );
          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              const newData = result.data;
              this.updateActiveCompilation(newData);
              this.loadEntityAfterCollection(
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
        }
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
  }

  private loadEntityAfterCollection(compilation, specifiedEntity?) {
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
    this.mongoHandlerService
      .getEntity(query)
      .then(resultEntity => {
        console.log('Received this Entity:', resultEntity);

        if (
          !resultEntity.finished ||
          !resultEntity.online ||
          resultEntity.whitelist.enabled
        ) {
          this.loadRestrictedEntity(resultEntity);
        } else {
          this.loadEntity(resultEntity);
        }
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
  }

  private loadRestrictedEntity(resultEntity) {
    this.userDataService.userAuthentication(true).then(auth => {
      if (auth) {
        this.userDataService
          .checkOwnerState(resultEntity)
          .then(owned => {
            if (owned) {
              this.loadEntity(resultEntity);
            } else {
              if (resultEntity.whitelist.enabled) {
                this.userDataService
                  .isUserWhitelisted(resultEntity)
                  .then(whitelisted => {
                    if (whitelisted) {
                      this.loadEntity(resultEntity);
                    } else {
                      this.message.error(
                        'Sorry you are not allowed to load this object.',
                      );
                      this.loadFallbackEntity();
                    }
                  });
              } else {
                this.message.error(
                  'Sorry you are not allowed to load this object.',
                );
                this.loadFallbackEntity();
              }
            }
          })
          .catch(error => {
            console.error(error);
            this.loadFallbackEntity();
          });
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
        const _url = URL + newEntity.processed[this.actualEntityQuality];
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
                this.actualEntityMediaType = 'entity';
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
                  this.actualEntityMediaType = 'image';
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
                this.actualEntityMediaType = 'audio';
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
                  this.actualEntityMediaType = 'video';
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
    if (
      entity.mediaType === 'model' ||
      entity.mediaType === 'entity' ||
      entity.mediaType === 'image'
    ) {
      this.meshSettings = true;
    }
    let upload = false;
    if (
      !entity.settings ||
      entity.settings.preview === undefined ||
      // TODO: how to check if settings need to be set? atm next line
      entity.settings.preview === '' ||
      entity.settings.cameraPositionInitial === undefined ||
      entity.settings.background === undefined ||
      entity.settings.lights === undefined ||
      entity.settings.rotation === undefined ||
      entity.settings.scale === undefined
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
      this.userDataService.checkOwnerState(entity).then(owned => {
        this.annotatingFeatured = owned;
        if (!owned && this.showAnnotationEditor) {
          this.showAnnotationEditor = false;
        }
        return;
      });
    } else {
      const compilation = this.getCurrentCompilation();
      if (!compilation) {
        if (this.showAnnotationEditor) this.showAnnotationEditor = false;
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
        await this.userDataService.checkOwnerState(compilation);
        if (this.userDataService.userOwnsCompilation) {
          this.annotatingFeatured = true;
          return;
        }
        this.userDataService.isUserWhitelisted(compilation).then(listed => {
          this.annotatingFeatured = listed;
          if (!listed && this.showAnnotationEditor) {
            this.showAnnotationEditor = false;
          }
          return;
        });
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
