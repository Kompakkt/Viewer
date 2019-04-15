import {EventEmitter, Injectable, Output} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {ReplaySubject} from 'rxjs';

import {environment} from '../../../environments/environment';
import {Model} from '../../interfaces/model/model.interface';
import {ActionService} from '../action/action.service';
import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';
import {MessageService} from '../message/message.service';
import {MetadataService} from '../metadata/metadata.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {SizedEvent} from '../../interfaces/sizedEvent/sizedEvent';

@Injectable({
  providedIn: 'root',
})

export class LoadModelService {

  private Subjects = {
    actualModel: new ReplaySubject<Model>(),
    actualModelMeshes: new ReplaySubject<BABYLON.Mesh[]>(),
    actualCollection: new ReplaySubject<any>(),
  };

  public Observables = {
    actualModel: this.Subjects.actualModel.asObservable(),
    actualModelMeshes: this.Subjects.actualModelMeshes.asObservable(),
    actualCollection: this.Subjects.actualCollection.asObservable(),
  };

  public personalCollections: any[] = [];
  public userOwnedModels: any[] = [];
  public userOwnedFinishedModels: any[] = [];
  public currentUserData: any;

  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;
  public quality = 'low';
  public high = '';
  public low = '';
  public medium = '';

  private defaultModel: Model;

  public isSingleLoadModel: boolean;
  public isSingleLoadCollection: boolean;
  public isDefaultLoad: boolean;
  public isModelOwner: boolean;
  public isFinished: boolean;
  public isLoaded: boolean;
  public isCollectionOwner: boolean;

  @Output() singleCollection: EventEmitter<boolean> = new EventEmitter();
  @Output() singleModel: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultLoad: EventEmitter<boolean> = new EventEmitter();
  @Output() modelOwner: EventEmitter<boolean> = new EventEmitter();
  @Output() finished: EventEmitter<boolean> = new EventEmitter();
  @Output() loaded: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionOwner: EventEmitter<boolean> = new EventEmitter();
  @Output() imagesource: EventEmitter<string> = new EventEmitter();


  constructor(public babylonService: BabylonService,
              private actionService: ActionService,
              private cameraService: CameraService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              private mongohandlerService: MongohandlerService,
              private message: MessageService,
              private metadataService: MetadataService) {
  }

  public getCurrentModel() {
    return this.Observables.actualModel.source['_events'].slice(-1)[0];
  }

  public getCurrentCompilation() {
    return this.Observables.actualCollection.source['_events'].slice(-1)[0];
  }

  public updateActiveModel(model: Model) {
    this.Subjects.actualModel.next(model);
  }

  public updateActiveCollection(collection: any) {
    this.Subjects.actualCollection.next(collection);
  }

  public updateActiveModelMeshes(meshes: BABYLON.Mesh[]) {
    this.Subjects.actualModelMeshes.next(meshes);
  }

  public fetchModelData(query: string) {
    this.mongohandlerService.getModel(query).then(resultModel => {
      this.isLoaded = false;
      this.loaded.emit(false);
      this.isSingleLoadModel = true;
      this.singleModel.emit(true);
      this.isSingleLoadCollection = false;
      this.singleCollection.emit(false);
      this.isDefaultLoad = false;
      this.defaultLoad.emit(false);
      this.quality = 'low';
      this.loadModel(resultModel).then(result => {
        this.isLoaded = true;
        this.loaded.emit(true);
      }, error => {
        this.message.error('Loading not possible');
      });
    });
  }

  public fetchCollectionData(identifier: string) {
    this.isLoaded = false;
    this.loaded.emit(false);
    this.isSingleLoadCollection = true;
    this.singleCollection.emit(true);
    this.isDefaultLoad = false;
    this.defaultLoad.emit(false);
    this.quality = 'low';
    this.mongohandlerService.getCompilation(identifier).then(compilation => {
      this.updateActiveCollection(compilation);
      this.loadModel(compilation.models[0]).then(result => {
        this.isLoaded = true;
        this.loaded.emit(true);
      }, error => {
        this.message.error('Loading not possible');
      });
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  public loadDefaultModelData() {
    this.isLoaded = false;
    this.loaded.emit(false);
    this.isDefaultLoad = true;
    this.defaultLoad.emit(true);
    this.isSingleLoadModel = false;
    this.singleModel.emit(false);
    this.isSingleLoadCollection = false;
    this.singleCollection.emit(false);
    this.quality = 'low';
    this.defaultModel = {
      _id: 'Cube',
      relatedDigitalObject: {_id: 'default_model'},
      name: 'Cube',
      cameraPosition: [{dimension: 'x', value: 0}, {dimension: 'y', value: 0}, {dimension: 'z', value: 0}],
      files: ['{file_name: \'kompakkt.babylon\',' +
      '          file_link: \'assets/models/kompakkt.babylon\',' +
      '          file_size: 0,' +
      '          file_format: \'.babylon\'}'],
      finished: true,
      online: true,
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
    this.loadModel(this.defaultModel, '').then(result => {
      this.isLoaded = true;
      this.loaded.emit(true);
    }, error => {
      this.message.error('Loading not possible');
    });
    this.metadataService.addDefaultMetadata();
  }

  public loadSelectedModel(model: Model, collection: boolean) {
    this.isLoaded = false;
    this.loaded.emit(false);
    this.isDefaultLoad = false;
    this.defaultLoad.emit(false);
    this.isSingleLoadModel = false;
    this.singleModel.emit(false);
    this.isSingleLoadCollection = false;
    this.singleCollection.emit(false);
    if (!collection) {
      this.updateActiveCollection([]);
    }
    this.quality = 'low';
    this.loadModel(model).then(result => {
      this.isLoaded = true;
      this.loaded.emit(true);
    }, error => {
      this.message.error('Loading not possible');
    });
  }

  public updateModelQuality(quality: string) {
    if (this.quality !== quality) {
      this.quality = quality;
      this.isLoaded = false;
      this.loaded.emit(false);
      const _model = this.Observables.actualModel.source['_events'].slice(-1)[0];
      if (_model.processed[this.quality] !== undefined) {
        this.loadModel(_model).then(result => {
          this.isLoaded = true;
          this.loaded.emit(true);
        }, error => {
          this.message.error('Loading not possible');
        });
      } else {
        this.message.error('Model quality is not available.');
      }
    } else {
      return;
    }
  }


  private isSizedEvent(e: any): e is SizedEvent {
    return (e && e.width !== undefined && e.height !== undefined);
  }

  public async loadModel(newModel: Model, overrideUrl?: string) {
    const URL = (overrideUrl !== undefined) ? overrideUrl : this.baseUrl;

    if (this.userOwnedModels.length === 0 && !this.isDefaultLoad) {
      await this.getUserData();
    }


    if (!this.loadingScreenHandler.isLoading && newModel.processed) {

      // cases: model, image, audio, video, text
      let mediaType: string;
      if (newModel.mediaType) {
        mediaType = newModel.mediaType;
      } else {
        mediaType = '';
      }

      if (mediaType && mediaType !== '') {
        switch (mediaType) {
          case 'model':
            break;

          case 'image':

            this.imagesource.emit(newModel.processed[this.quality]);

            console.log('ein Bild!', newModel.processed[this.quality]);
            const image = new Image();
            image.src = newModel.processed[this.quality];
            console.log('Bild', image);


            image.onload = (event) => {
              if (this.isSizedEvent(event)) {
                // event.width is now available
                console.log(image.height, 'Höhe');
                console.log('event', event);
                console.log('ein Bild mit der Größe:', event.width, event.height);
              }
            };

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


      await this.babylonService.loadModel(URL, newModel.processed[this.quality], mediaType).then(async model => {
        // Warte auf Antwort von loadModel, da loadModel ein Promise<object> von ImportMeshAync übergibt
        // model ist hier das neu geladene Model
        this.updateActiveModel(newModel);
        this.updateActiveModelMeshes(model.meshes);

        if (newModel._id && !this.isDefaultLoad) {
          this.checkOwnerState(newModel._id);
        }


        if (!newModel.finished) {
          this.finished.emit(false);
          this.isFinished = false;
        } else {
          this.checkAvailableQuality();
          if (this.isSingleLoadCollection && !this.isDefaultLoad) {
            this.checkOwnerStateCollection();
          } else {
            this.isCollectionOwner = false;
            this.collectionOwner.emit(false);
          }

          this.finished.emit(true);
          this.isFinished = true;
        }

      });

    }
  }

  public async getUserData() {
    return new Promise((resolve, reject) => {
      this.mongohandlerService.getCurrentUserData().then(userData => {
        resolve(userData);
        if (userData && userData.message === 'Invalid session') {
          this.message.info('User not logged in');
        } else if (!userData || !userData.data) {
          this.message.info('No valid userdata received');
        } else {
          this.currentUserData = userData;
          this.userOwnedModels = userData.data.model;
          if (userData.data && userData.data.model) {
            userData.data.model.forEach(model => {
              if (model !== null) {
                this.userOwnedFinishedModels.push(model);
              }
            });
          }
          if (userData.data && userData.data.compilation) {
            this.personalCollections = userData.data.compilation;
          }
        }
      }, error => {
        this.message.error('Connection to object server refused.');
        reject('Connection to object server refused.');
      });
    });
  }

  private checkOwnerState(identifier: string) {
    if (this.userOwnedModels.filter(obj => obj && obj._id === identifier).length === 1) {
      this.isModelOwner = true;
      this.modelOwner.emit(true);
    } else {
      this.isModelOwner = false;
      this.modelOwner.emit(false);
    }
  }

  private checkOwnerStateCollection() {
    if (this.getCurrentCompilation()) {
      if (this.personalCollections.filter(obj => obj && obj._id === this.getCurrentCompilation()._id).length === 1) {
        this.isCollectionOwner = true;
        this.collectionOwner.emit(true);
      } else {
        this.isCollectionOwner = false;
        this.collectionOwner.emit(false);
      }
    } else {
      this.isCollectionOwner = false;
      this.collectionOwner.emit(false);
    }
  }

  private checkAvailableQuality() {
    const _model = this.Observables.actualModel.source['_events'].slice(-1)[0];

    if (_model.processed['low'] !== undefined) {
      this.low = _model.processed['low'];
    } else {
      this.low = '';
    }
    if (_model.processed['high'] !== undefined && _model.processed['high'] !== _model.processed['low']) {
      this.high = _model.processed['high'];
    } else {
      this.high = '';
    }
    if (_model.processed['medium'] !== undefined && _model.processed['medium'] !== _model.processed['low']) {
      this.medium = _model.processed['medium'];
    } else {
      this.medium = '';
    }
  }

}
