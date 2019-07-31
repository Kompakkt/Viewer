import {EventEmitter, Injectable, Output} from '@angular/core';
import {Mesh} from 'babylonjs';
import {BehaviorSubject} from 'rxjs';
import {ReplaySubject} from 'rxjs/internal/ReplaySubject';

import {environment} from '../../../environments/environment';
import {ICompilation, IModel} from '../../interfaces/interfaces';
import {BabylonService} from '../babylon/babylon.service';
import {LoadingscreenhandlerService} from '../babylon/loadingscreen';
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
    actualModelMeshes: new ReplaySubject<Mesh[]>(),
    actualCollection: new ReplaySubject<ICompilation | undefined>(),
    actualMediaType: new ReplaySubject<string>(),
  };

  public Observables = {
    models: this.Subjects.models.asObservable(),
    collections: this.Subjects.collections.asObservable(),
    actualModel: this.Subjects.actualModel.asObservable(),
    actualModelMeshes: this.Subjects.actualModelMeshes.asObservable(),
    actualCollection: this.Subjects.actualCollection.asObservable(),
    actualMediaType: this.Subjects.actualMediaType.asObservable(),
  };

  private isFirstLoad = true;
  public isLoggedIn = false;
  public isShowCatalogue = false;
  public isCollectionLoaded = false;
  public isDefaultModelLoaded = false;
  public isFallbackModelLoaded = false;

  @Output() showCatalogue: EventEmitter<boolean> = new EventEmitter();
  @Output() loggedIn: EventEmitter<boolean> = new EventEmitter();
  @Output() firstLoad: EventEmitter<boolean> = new EventEmitter();
  @Output() loaded: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionLoaded: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultModelLoaded: EventEmitter<boolean> = new EventEmitter();
  @Output() fallbackModelLoaded: EventEmitter<boolean> = new EventEmitter();

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
              private loadingScreenHandler: LoadingscreenhandlerService,
              private metadataService: MetadataService) {
  }

  public getCurrentModel(): IModel | undefined {
    return this.Observables.actualModel.source['_events'].slice(-1)[0];
  }

  public getCurrentCompilation(): ICompilation | undefined {
    return this.Observables.actualCollection.source['_events'].slice(-1)[0];
  }

  public getCurrentMediaType(): string {
    return this.Observables.actualMediaType.source['_events'].slice(-1)[0] ?
      this.Observables.actualMediaType.source['_events'].slice(-1)[0] : '';
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

  public updateActiveModelMeshes(meshes: Mesh[]) {
    this.Subjects.actualModelMeshes.next(meshes);
  }

  public setupDragAndDrop() {
    const readDir = async dir => {
      const dirReader = dir.createReader();
      return new Promise<File[]>((resolve, _) => {
        const files: File[] = [];
        dirReader.readEntries((entries: any[]) => {
          for (let i = 0; i < entries.length; i++) {
            entries[i].file(file => {
              files.push(file);
              if (i === entries.length - 1) {
                resolve(files);
              }
            });
          }
        });
      });
    };

    document.ondrop = async event => {
      if (!event.dataTransfer) {
        console.warn('No dataTransfer on event', event);
        return;
      }
      console.log('Drop event', event, event.dataTransfer.files);
      event.preventDefault();
      mediaType = '';
      fileExts.splice(0, fileExts.length);
      fileList.splice(0, fileList.length);
      window.top.postMessage({ type: 'resetQueue' }, environment.repository);
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        const _item = event.dataTransfer.items[i];
        const _entry = _item.webkitGetAsEntry();
        console.log(_entry);
        if (_entry.isDirectory) {
          const res = await readDir(_entry);
          console.log(res);
          fileList.push(...res);
        } else {
          await new Promise((resolve, _) => {
            _entry.file(file => {
              fileList.push(file);
              resolve();
            });
          });
        }
      }
      for (const _file of fileList) {
        const _fileName = _file.name;
        const _ext = _fileName.substr(_fileName.lastIndexOf('.'));
        fileExts.push(_ext.toLowerCase());
      }
      window.top.postMessage({ files: fileList, mediaType, type: 'fileList' }, environment.repository);

      getMediaType();
    };
    document.ondragover = event => {
      event.preventDefault();
      // TODO: document.ondragover for cool effects
    };

    // Determine mediaType by extension
    const modelExts = ['.babylon', '.obj', '.stl', '.glft'];
    const imageExts = ['.jpg', '.jpeg', '.png'];
    const videoExts = ['.webm', '.mp4', '.avi'];
    const audioExts = ['.ogg', '.mp3'];
    const fileExts: string[] = [];
    const fileList: File[] = [];
    let mediaType = '';
    let ext = '.babylon';

    const fileReader = new FileReader();
    fileReader.onload = evt => {
      const base64 = (evt.currentTarget as FileReader).result as string;
      this.loadModel(
        {
          _id: 'dragdrop',
          name: 'dragdrop',
          annotationList: [],
          files: [],
          finished: false,
          online: false,
          mediaType,
          dataSource: {
            isExternal: false,
          },
          processed: {
            low: base64, medium: base64,
            high: base64, raw: base64,
          },
        },
        '', ext)
        .then(() => this.loaded.emit(true));
    };

    const getMediaType = () => {
      const _countMedia = {
        model: 0, image: 0,
        video: 0, audio: 0,
      };

      // Count file occurences
      for (const _ext of fileExts) {
        switch (true) {
          case modelExts.includes(_ext): _countMedia.model++; break;
          case imageExts.includes(_ext): _countMedia.image++; break;
          case videoExts.includes(_ext): _countMedia.video++; break;
          case audioExts.includes(_ext): _countMedia.audio++; break;
          default:
        }
      }

      // Since this is checking in order (model first)
      // we are able to determine models, even if e.g. textures are
      // also found
      switch (true) {
        case _countMedia.model > 0: mediaType = 'model'; break;
        case _countMedia.image > 0: mediaType = 'image'; break;
        case _countMedia.video > 0: mediaType = 'video'; break;
        case _countMedia.audio > 0: mediaType = 'audio'; break;
        default:
      }

      // Read content of single non-model file
      if (mediaType !== 'model') {
        if (fileList.length > 1) {
          return;
          // Too many files
        }
        fileReader.readAsDataURL(fileList[0]);
      } else {
        const largest = fileList
          .filter(file => modelExts.includes(file.name.substr(file.name.lastIndexOf('.'))))
          .sort((a, b) => b.size - a.size)[0];
        ext = largest.name.substr(largest.name.lastIndexOf('.'));
        fileReader.readAsDataURL(largest);
      }
    };

    this.babylonService.getEngine().loadingUIText = `Drop a single file (model, image, audio, video) or a folder containing a 3d model here`;
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
          console.error(error);
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
    const isDragDrop = queryParams.get('dragdrop');

    this.firstLoad.emit(false);
    this.isFirstLoad = false;
    this.isShowCatalogue = false;

    if (isDragDrop) {
      // this.babylonService.setupDragAndDrop();
      this.setupDragAndDrop();
      return;
    }

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
        console.error(error);
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
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to object server refused.');
      });
  }

  public fetchModelsData() {
    this.mongoHandlerService.getAllModels()
      .then(models => {
        const modelsforBrowser: IModel[] = [];

        models
          .filter(model => model)
          .forEach((model: IModel) => {
          if (model.finished) {
            modelsforBrowser.push(model);
          }
        });
        this.Subjects.models.next(modelsforBrowser);
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to object server refused.');
      });
  }

  public loadDefaultModelData() {
    this.loaded.emit(false);
    this.quality = 'low';
    this.loadModel(this.defaultModel, '')
      .then(() => {
        this.loaded.emit(true);
        this.metadataService.addDefaultMetadata();
      })
      .catch(error => {
        console.error(error);
        this.message.error('Loading of default model not possible');
      });
  }

  public fetchAndLoad(modelId?: string, collectionId?: string, isfromCollection?: boolean) {
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
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to object server to load collection refused.');
        });
    }
  }

  public fetchModelData(query: string) {
    this.mongoHandlerService.getModel(query)
      .then(resultModel => {
        this.loadModel(resultModel)
          .then(result => {
            this.loaded.emit(true);
            console.log('Load:', result);
          })
          .catch(error => {
            console.error(error);
            this.message.error('Loading of this Model is not possible');
          });
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to object server to load model refused.');
      });
  }

  public async loadModel(newModel: IModel, overrideUrl?: string, extension = '.babylon') {
    const URL = (overrideUrl !== undefined) ? overrideUrl : this.baseUrl;
    this.isFallbackModelLoaded = false;
    this.fallbackModelLoaded.emit(false);

    if (!this.loadingScreenHandler.isLoading && newModel.processed
      && newModel.mediaType) {

      if (!newModel.dataSource.isExternal) {
        // cases: model, image, audio, video, text
        const _url = URL + newModel.processed[this.quality];
        const mediaType = newModel.mediaType;
        switch (newModel.mediaType) {
          case 'model':
            await this.babylonService.loadEntity(_url, mediaType, extension)
              .then(() => {
                this.updateActiveModel(newModel);
                this.updateActiveModelMeshes(this.babylonService.modelContainer.meshes as Mesh[]);
                this.Subjects.actualMediaType.next('model');
              });
            break;
          case 'image':
            await this.babylonService.loadEntity(_url, mediaType)
              .then(() => {
                const plane = this.babylonService.imageContainer.plane;
                if (plane) {
                  this.Subjects.actualMediaType.next('image');
                  this.updateActiveModel(newModel);
                  this.updateActiveModelMeshes([plane as Mesh]);
                }
              });
            break;
          case 'audio':
            await this.babylonService.loadEntity(_url, mediaType)
              .then(() => {
                const plane = this.babylonService.audioContainer.plane;
                if (plane) {
                  this.Subjects.actualMediaType.next('audio');
                  this.updateActiveModel(newModel);
                  this.updateActiveModelMeshes([plane as Mesh]);
                }
              });
            break;
          case 'video':
            await this.babylonService.loadEntity(_url, mediaType)
              .then(() => {
                const plane = this.babylonService.videoContainer.plane;
                if (plane) {
                  this.Subjects.actualMediaType.next('video');
                  this.updateActiveModel(newModel);
                  this.updateActiveModelMeshes([plane as Mesh]);
                }
              });
            break;
          case 'text':
            this.Subjects.actualModel.next(newModel);
            await this.loadFallbackModel();
            this.Subjects.actualMediaType.next('text');
            break;
          default:
        }
      } else {
        this.Subjects.actualModel.next(newModel);
        await this.loadFallbackModel();
        return;
      }
    }
  }

  public async loadFallbackModel() {
    await this.babylonService.loadEntity('assets/models/sketch_cat/scene.gltf', 'model', '.gltf')
      .then(() => {
        this.updateActiveModelMeshes(this.babylonService.modelContainer.meshes as Mesh[]);
        this.isFallbackModelLoaded = true;
        this.fallbackModelLoaded.emit(true);
        this.Subjects.actualMediaType.next('model');
      });
  }

  public updateModelQuality(quality: string) {
    if (this.quality !== quality) {
      this.quality = quality;
      const model = this.getCurrentModel();

      if (!model || !model.processed) {
        throw new Error('Model or Model.processed');
        console.error(this);
        return;
      }
      if (model && model.processed[this.quality] !== undefined) {
        this.loaded.emit(false);
        this.loadModel(model._id === 'Cube' ? this.defaultModel : model, model._id === 'Cube' ? '' : undefined)
          .then(() => {
            this.loaded.emit(true);
          })
          .catch(error => {
            console.error(error);
            this.message.error('Loading not possible');
          });
      } else {
        this.message.error('Model quality is not available.');
      }
    } else {
      return;
    }
  }

  public async selectCollectionByID(identifierCollection: string): Promise<string> {
    // Check if collection has been initially loaded and is available in collections
    const collection: ICompilation | null =
      this.Observables.collections.source['value']
        .find(i => i._id === identifierCollection);

    return new Promise((resolve, reject) => {
      if (!collection) {
        // If collection has not been loaded during initial load
        // try to find it on the server
        this.mongoHandlerService.getCompilation(identifierCollection)
          .then(compilation => {
            console.log('die compi ist', compilation);
            // collection is available on server
            if (compilation['_id']) {
              // TODO: add to Subjects?
              this.fetchAndLoad(undefined, compilation._id, undefined);
              resolve('loaded');
            } else if (compilation['status'] === 'ok'
              && compilation['message'] === 'Password protected compilation') {
              resolve('password');
            } else {
              // collection ist nicht erreichbar
              resolve('missing');
            }
          })
          .catch(error => {
            console.error(error);
            this.message.error('Connection to object server refused.');
            reject('missing');
          });
      } else {
        // collection is available in collections and will be loaded
        this.fetchAndLoad(undefined, collection._id, undefined);
        return 'loaded';
      }
    });
  }

  public selectModelByID(identifierModel: string): boolean {
    // TODO: check if this correctly returns
    const model = this.Observables.models.source['value'].find(i => i._id === identifierModel);
    if (model === undefined) {
      this.mongoHandlerService.getModel(identifierModel)
        .then(actualModel => {
          if (actualModel['_id']) {
            this.Subjects.models.next([actualModel]);
            this.fetchAndLoad(actualModel._id, undefined, false);
            return true;
          }
          return false;
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to object server refused.');
          return false;
        });
    }
    this.fetchAndLoad(model._id, undefined, false);

    return true;
  }

}
