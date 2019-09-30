import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Mesh } from 'babylonjs';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';

import {
  defaultEntity,
  fallbackEntity,
} from '../../../assets/entities/entities';
import { environment } from '../../../environments/environment';
// tslint:disable-next-line:max-line-length
import { DialogPasswordComponent } from '../../components/dialogs/dialog-password/dialog-password.component';
import { ICompilation, IEntity } from '../../interfaces/interfaces';
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

  public compilationLoaded = false;
  public defaultEntityLoaded = false;
  public fallbackEntityLoaded = false;
  public actualEntityMediaType = '';
  private actualEntityQuality = 'low';
  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;

  // manage general features depending on mode
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
  ) {}

  private getCurrentEntity(): IEntity | undefined {
    return this.Observables.actualEntity.source['_events'].slice(-1)[0];
  }

  private async setAnnotatingFeatured(entity: IEntity) {
    // mode = '' || upload || explore || edit || annotation || open &&
    // compilation (whitelist || entity => showAnnotationEditor
    // mediatype = 'model' || 'entity' || 'image' || 'audio' || 'video
    // entity: default || fallback || owner
    const mediatype = entity.mediaType;

    if (
      (this.showAnnotationEditor && mediatype === 'image') ||
      mediatype === 'entity' ||
      mediatype === 'model'
    ) {
      if (
        !this.compilationLoaded &&
        !this.defaultEntityLoaded &&
        !this.fallbackEntityLoaded
      ) {
        if (this.userDataService.userOwnsEntity) {
          this.annotatingFeatured = true;
        } else {
          if (this.userDataService.authenticatedUser) {
            this.userDataService.checkOwnerState(entity).then(owned => {
              if (owned) {
                this.annotatingFeatured = true;
              } else {
                this.message.error(
                  'Sorry, you are not authorized to annotate this Object.',
                );
              }
            });
          }
        }
      } else {
        this.annotatingFeatured = true;
      }
    }
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
  }

  public async updateActiveCompilation(compilation: ICompilation | undefined) {
    this.Subjects.actualCompilation.next(compilation);
    if (compilation && compilation._id) {
      this.compilationLoaded = true;
      if (this.showAnnotationEditor) {
        await this.userDataService.checkOwnerState(compilation);
        if (compilation.whitelist.enabled) {
          this.userDataService.isUserWhitelisted(compilation).then(listed => {
            if (!listed) {
              this.showAnnotationEditor = false;
              this.message.error(
                'Sorry, you are not authorized to annotate this Collection.',
              );
            }
          });
        }
      }
      this.showCompilationBrowser = true;
    } else {
      this.compilationLoaded = false;
    }
  }

  public async updateActiveEntityMeshes(meshes: Mesh[], entity: IEntity) {
    await this.setAnnotatingFeatured(entity);
    this.Subjects.actualEntityMeshes.next(meshes);
  }

  public bootstrap(): void {
    const searchParams = location.search;
    const queryParams = new URLSearchParams(searchParams);
    const entityParam = queryParams.get('model') || queryParams.get('entity');
    const compParam = queryParams.get('compilation');
    // values = upload, explore, edit, annotation, open
    const mode = queryParams.get('mode');
    this.mode = mode ? mode : '';

    if (!this.mode) this.showMenu = false;
    if (this.mode === 'annotation') {
      if (compParam || entityParam) {
        this.userDataService.userAuthentication(true).then(result => {
          if (result) {
            this.overlayService.toggleSidenav('annotation', true);
          } else {
            this.message.error(
              'Sorry, you are not allowed to annotate this Object' +
                'if you are not logged in.',
            );
            this.showAnnotationEditor = false;
            this.showSidenav = false;
          }
        });
      }
      this.overlayService.toggleSidenav('annotation', true);
    }
    if (compParam) {
      this.fetchAndLoad(entityParam ? entityParam : undefined, compParam, true);

      if (!mode || mode === 'explore' || mode === 'open') {
        this.showAnnotationEditor = false;
        this.overlayService.toggleSidenav('compilationBrowser', true);
      }
    } else {
      if (!mode || mode === 'open') this.showSidenav = false;
      if (!entityParam) {
        this.loadDefaultEntityData();
      } else {
        this.fetchAndLoad(entityParam, undefined, false);
        // tslint:disable-next-line:prefer-switch
        if (mode === 'upload' || mode === 'explore' || mode === 'edit') {
          this.overlayService.toggleSidenav('settings', true);
          if (mode !== 'upload') this.showAnnotationEditor = false;
          if (mode !== 'explore') {
            this.userDataService.userAuthentication(true).then(result => {
              if (!result) {
                this.message.error(
                  'Sorry, you are not allowed to edit this Object' +
                    'if you are not logged in.',
                );
                this.showSidenav = false;
              }
            });
          }
        }
      }
    }
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
    isfromCompilation?: boolean,
  ) {
    this.actualEntityQuality = 'low';

    if (!compilationId && !isfromCompilation) {
      this.compilationLoaded = false;
    }

    if (entityId && !compilationId) {
      this.fetchEntityData(entityId);
      if (!isfromCompilation) {
        this.updateActiveCompilation(undefined);
      }
    }
    if (compilationId) {
      this.fetchCompilationData(compilationId, entityId ? entityId : undefined);
    }
  }

  // TODO check all responses as soon as they exist and refactor
  private fetchCompilationData(
    query: string,
    specifiedEntity?: string,
    password?: string,
  ) {
    this.mongoHandlerService
      .getCompilation(query, password ? password : undefined)
      .then(compilation => {
        if (
          (compilation['status'] === 'ok' &&
            compilation['message'] === 'Password protected compilation') ||
          compilation.password !== ''
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
              if (specifiedEntity) {
                const loadEntity = newData.entities.find(
                  e => e && e._id === specifiedEntity,
                );
                if (loadEntity && isEntityForCompilation(loadEntity)) {
                  this.fetchEntityData(loadEntity._id);
                } else {
                  const entity = newData.entities[0];
                  if (isEntityForCompilation(entity))
                    this.fetchEntityData(entity._id);
                }
              } else {
                const entity = newData.entities[0];
                if (isEntityForCompilation(entity))
                  this.fetchEntityData(entity._id);
              }
            } else {
              this.loadFallbackEntity();
              this.message.error(
                'Sorry, you are not allowed to load this Collection.',
              );
            }
          });
        } else {
          // compilation is available on server
          if (compilation['_id']) {
            this.updateActiveCompilation(compilation);
            if (specifiedEntity) {
              const loadEntity = compilation.entities.find(
                e => e && e._id === specifiedEntity,
              );
              if (loadEntity && isEntityForCompilation(loadEntity)) {
                this.fetchEntityData(loadEntity._id);
              } else {
                const entity = compilation.entities[0];
                if (isEntityForCompilation(entity))
                  this.fetchEntityData(entity._id);
              }
            } else {
              const entity = compilation.entities[0];
              if (isEntityForCompilation(entity))
                this.fetchEntityData(entity._id);
            }
          }
        }
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
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
          this.userDataService.userAuthentication(true).then(auth => {
            if (auth) {
              this.userDataService.checkOwnerState(resultEntity).then(owned => {
                if (!owned) {
                  if (resultEntity.whitelist.enabled) {
                    this.userDataService
                      .isUserWhitelisted(resultEntity)
                      .then(whitelisted => {
                        if (whitelisted) {
                          this.loadEntity(resultEntity);
                        } else {
                          this.loadFallbackEntity();
                          this.message.error(
                            'Sorry, you are not ' +
                              'allowed to load this Object.',
                          );
                        }
                      });
                  } else {
                    this.loadFallbackEntity();
                    this.message.error(
                      'Sorry, you are not allowed to load this Object.',
                    );
                  }
                } else {
                  this.loadEntity(resultEntity);
                }
              });
            } else {
              this.loadFallbackEntity();
              this.message.error(
                'Sorry, you are not allowed to load this Object.',
              );
            }
          });
        } else {
          this.loadEntity(resultEntity);
        }
      })
      .catch(error => {
        console.error(error);
        this.loadFallbackEntity();
      });
  }

  public updateEntityQuality(quality: string) {
    if (this.actualEntityQuality !== quality) {
      this.actualEntityQuality = quality;
      const entity = this.getCurrentEntity();
      if (!entity || !entity.processed) {
        this.message.error(
          'The object is not available and unfortunately ' +
            'I can not update the actualEntityQuality.',
        );
        return;
      }
      if (entity && entity.processed[this.actualEntityQuality] !== undefined) {
        this.loadEntity(entity);
      } else {
        this.message.error('Entity actualEntityQuality is not available.');
      }
    }
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
}
