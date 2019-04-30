import {EventEmitter, Injectable, Output} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {BehaviorSubject} from 'rxjs';
import {ReplaySubject} from 'rxjs/internal/ReplaySubject';

import {environment} from '../../../environments/environment';
import {ICompilation, IModel} from '../../interfaces/interfaces';
import {ActionService} from '../action/action.service';
import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';
import {MessageService} from '../message/message.service';
import {MetadataService} from '../metadata/metadata.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {OverlayService} from '../overlay/overlay.service';

@Injectable({
  providedIn: 'root',
})

export class ProcessingService {

  // TODO: ReplaySubjects
  private Subjects = {
    models: new BehaviorSubject<IModel[]>(Array<IModel>()),
    collections: new BehaviorSubject<ICompilation[]>(Array<ICompilation>()),
    actualModel: new ReplaySubject<IModel>(),
    actualModelMeshes: new ReplaySubject<BABYLON.Mesh[]>(),
    actualCollection: new ReplaySubject<ICompilation | undefined>(),
  };

  public Observables = {
    models: this.Subjects.models.asObservable(),
    collections: this.Subjects.collections.asObservable(),
    actualModel: this.Subjects.actualModel.asObservable(),
    actualModelMeshes: this.Subjects.actualModelMeshes.asObservable(),
    actualCollection: this.Subjects.actualCollection.asObservable(),
  };

  private isFirstLoad = true;
  public isLoggedIn: boolean;
  public isShowCatalogue: boolean;
  private isLoaded = false;
  public isCollectionLoaded = false;
  public isDefaultModelLoaded = false;

  @Output() showCatalogue: EventEmitter<boolean> = new EventEmitter();
  @Output() loggedIn: EventEmitter<boolean> = new EventEmitter();
  @Output() firstLoad: EventEmitter<boolean> = new EventEmitter();
  @Output() loaded: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionLoaded: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultModelLoaded: EventEmitter<boolean> = new EventEmitter();

  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;
  public quality = 'low';

  private defaultModel: IModel = {
    _id: 'default',
    annotationList: [],
    relatedDigitalObject: {_id: 'default_model'},
    mediaType: 'model',
    name: 'Cube',
    dataSource: {isExternal: false},
    files: [{
      file_name: 'kompakkt.babylon',
      file_link: 'assets/models/kompakkt.babylon',
      file_size: 0,
      file_format: '.babylon',
    }],
    finished: true,
    online: true,
    settings: {
      cameraPositionInitial: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
    processed: {
      time: {
        start: '',
        end: '',
        total: '',
      },
      low: 'assets/models/kompakkt.babylon',
      medium: 'assets/models/kompakkt.babylon',
      high: 'assets/models/kompakkt.babylon',
      raw: 'assets/models/kompakkt.babylon',
    },
  };

  constructor(private mongoHandlerService: MongohandlerService,
              private message: MessageService,
              private overlayService: OverlayService,
              public babylonService: BabylonService,
              private actionService: ActionService,
              private cameraService: CameraService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              private metadataService: MetadataService) {
  }

  public getCurrentModel(): IModel | null {
    return this.Observables.actualModel.source['_events'].slice(-1)[0];
  }

  public getCurrentCompilation(): ICompilation | null {
    return this.Observables.actualCollection.source['_events'].slice(-1)[0];
  }

  public updateActiveModel(model: IModel) {
    this.Subjects.actualModel.next(model);
    if (model && model._id === 'default') {
      this.isDefaultModelLoaded = true;
      this.defaultModelLoaded.emit(true);
    } else {
      this.isDefaultModelLoaded = false;
      this.defaultModelLoaded.emit(false);
    }
  }

  public updateActiveCollection(collection: ICompilation | undefined) {
    this.Subjects.actualCollection.next(collection);
    if (collection && collection._id) {
      this.isCollectionLoaded = true;
      this.collectionLoaded.emit(true);
    } else {
      this.isCollectionLoaded = false;
      this.collectionLoaded.emit(false);
    }
  }

  public updateActiveModelMeshes(meshes: BABYLON.Mesh[]) {
    this.Subjects.actualModelMeshes.next(meshes);
  }

  public bootstrap(): void {
    if (!this.isFirstLoad) {
      this.firstLoad.emit(false);
      console.log('Page has already been initially loaded.');
      this.mongoHandlerService.isAuthorized()
        .then(result => {
          if (result.status === 'ok') {
            this.fetchCollectionsData();
            this.fetchModelsData();
            this.isLoggedIn = true;
            this.loggedIn.emit(true);
          } else {
            this.isLoggedIn = false;
            this.loggedIn.emit(false);
          }
        })
        .catch(error => {
          this.isLoggedIn = false;
          this.loggedIn.emit(false);
          this.message.error('Can not see if you are logged in.');
        });
      return;
    }

    const searchParams = location.search;
    const queryParams = new URLSearchParams(searchParams);
    const modelParam = queryParams.get('model');
    const compParam = queryParams.get('compilation');
    const url_split = location.href.split('?');

    this.firstLoad.emit(false);
    this.isFirstLoad = false;
    this.isShowCatalogue = false;

    if (!modelParam && !compParam) {
      this.loadDefaultModelData();
      this.isShowCatalogue = true;
      this.showCatalogue.emit(true);
    }

    this.mongoHandlerService.isAuthorized()
      .then(result => {
        console.log(result);
        if (result.status !== 'ok') {
          this.isLoggedIn = false;
          this.loggedIn.emit(false);
          return;
        }
        this.isLoggedIn = true;
        this.loggedIn.emit(true);

        if (modelParam && !compParam) {
          this.fetchAndLoad(modelParam, undefined, false);
          this.showCatalogue.emit(false);
        } else if (!modelParam && compParam) {
          this.fetchAndLoad(undefined, compParam, undefined);
          this.showCatalogue.emit(false);
          this.overlayService.toggleCollectionsOverview();
        } else {
          this.fetchCollectionsData();
          this.fetchModelsData();
        }
      })
      .catch(error => {
        this.isLoggedIn = false;
        this.loggedIn.emit(false);
        this.message.error(
          'Other Models and Collections are only available in the Cologne University ' +
          'Network for logged in Users.');
      });
  }

  public fetchCollectionsData() {
    this.mongoHandlerService.getAllCompilations()
      .then(compilation => {
        this.Subjects.collections.next(compilation);
      },    error => {
        this.message.error('Connection to object server refused.');
      });
  }

  public fetchModelsData() {
    this.mongoHandlerService.getAllModels()
      .then(models => {
        this.Subjects.models.next(models);
      },    error => {
        this.message.error('Connection to object server refused.');
      });
  }

  public async selectCollectionByID(identifierCollection: string): Promise<string> {
    // Check if collection has been initially loaded and is available in collections
    const collection = this.Observables.collections.source['value']
      .find(i => i._id === identifierCollection);
    // If collection has not been loaded during initial load
    if (collection === undefined) {
      // try to find it on the server
      return new Promise((resolve, reject) => {
        this.mongoHandlerService.getCompilation(identifierCollection)
          .then(compilation => {
            console.log('die compi ist', compilation);
            // collection is available on server
            if (compilation['_id']) {
              this.addAndLoadCollection(compilation);
              resolve('loaded');
            } else if (compilation['status'] === 'ok'
              && compilation['message'] === 'Password protected compilation') {
              resolve('password');
            } else {
              // collection ist nicht erreichbar
              resolve('missing');
            }
          },    error => {
            this.message.error('Connection to object server refused.');
            reject('missing');
          });
      });
      // collection is available in collections and will be loaded
    } else {
      this.fetchAndLoad(undefined, collection._id, undefined);
      return 'loaded';
    }
  }

  public selectModelByID(identifierModel: string): boolean {
    const model = this.Observables.models.source['value'].find(i => i._id === identifierModel);
    if (model === undefined) {
      this.mongoHandlerService.getModel(identifierModel)
        .then(actualModel => {
          if (actualModel['_id']) {
            this.Subjects.models.next([actualModel]);
            this.fetchAndLoad(actualModel._id, undefined, false);
            return true;
          } else {
            return false;
          }
        },    error => {
          this.message.error('Connection to object server refused.');
          return false;
        });
    }
    this.fetchAndLoad(model._id, undefined, false);

    return true;
  }

  public addAndLoadCollection(compilation: ICompilation) {
    // this.Subjects.collections.next(compilation);
    // TODO
    this.fetchAndLoad(undefined, compilation._id, undefined);
  }

  public loadDefaultModelData() {
    this.isLoaded = false;
    this.loaded.emit(false);
    this.quality = 'low';
    this.loadModel(this.defaultModel, '')
      .then(result => {
        this.isLoaded = true;
        this.loaded.emit(true);
        this.metadataService.addDefaultMetadata();
      },    error => {
        this.message.error('Loading of default model not possible');
      });
  }

  public fetchAndLoad(modelId?: string, collectionId?: string, isfromCollection?: boolean) {
    this.isLoaded = false;
    this.loaded.emit(false);
    this.quality = 'low';
    if (modelId) {
      this.fetchModelData(modelId);
      if (!isfromCollection) {
        this.updateActiveCollection(undefined);
      }
    }
    if (collectionId) {
      this.mongoHandlerService.getCompilation(collectionId)
        .then(compilation => {
          // TODO: Put Typeguards in its own service?
          const isModel = (obj: any): obj is IModel => {
            const _model = obj as IModel;
            return _model && _model.name !== undefined && _model.mediaType !== undefined
              && _model.online !== undefined && _model.finished !== undefined;
          };
          this.updateActiveCollection(compilation);
          const model = compilation.models[0];
          if (isModel(model)) this.fetchModelData(model._id);
        },    error => {
          this.message.error('Connection to object server to load collection refused.');
        });
    }
  }

  public fetchModelData(query: string) {
    this.mongoHandlerService.getModel(query)
      .then(resultModel => {
        this.loadModel(resultModel)
          .then(result => {
            this.isLoaded = true;
            this.loaded.emit(true);
            console.log('Load:', result);
          },    error => {
            this.message.error('Loading of this Model is not possible');
          });
      },    error => {
        this.message.error('Connection to object server to load model refused.');
      });
  }

  public async loadModel(newModel: IModel, overrideUrl?: string) {
    const URL = (overrideUrl !== undefined) ? overrideUrl : this.baseUrl;

    if (!this.loadingScreenHandler.isLoading && newModel.processed && newModel.mediaType) {

      // cases: model, image, audio, video, text
      switch (newModel.mediaType) {
        case 'model':
          await this.babylonService.loadModel(URL, newModel.processed[this.quality])
            .then(async model => {
              // Warte auf Antwort von loadModel,
              // da loadModel ein Promise<object> von ImportMeshAync übergibt
              // model ist hier das neu geladene Model
              this.updateActiveModel(newModel);
              this.updateActiveModelMeshes(model.meshes);
            });
          break;

        case 'image':

          // TODO
          this.updateActiveModel(newModel);

          //  this.imagesource.emit(newModel.processed[this.quality]);

          console.log('ein Bild!', newModel.processed[this.quality]);
          const image = new Image();
          //  image.src = newModel.processed[this.quality];
          console.log('Bild', image);

          /*
          const reader = new FileReader();
          reader.readAsDataURL(newModel.processed[this.quality]);
          reader.onload =_event => {
            console.log('OHOHOH', event);
          };*/

          break;

        case 'audio':
          break;

        case 'video':
          break;

        case 'text':
          break;

        default:
      }
    }
  }

  public updateModelQuality(quality: string) {
    if (this.quality !== quality) {
      this.quality = quality;
      this.isLoaded = false;
      this.loaded.emit(false);
      const model = this.getCurrentModel();
      if (!model || !model.processed) return;
      if (model.processed[this.quality] !== undefined) {
        this.loadModel(model._id === 'Cube' ? model : this.defaultModel, '')
          .then(result => {
            this.isLoaded = true;
            this.loaded.emit(true);
          },    error => {
            this.message.error('Loading not possible');
          });
      } else {
        this.message.error('Model quality is not available.');
      }
    } else {
      return;
    }
  }

}
