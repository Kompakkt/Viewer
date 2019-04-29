import {EventEmitter, Injectable, Output} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {ReplaySubject} from 'rxjs';

import {environment} from '../../../environments/environment';
import {ICompilation, IModel, ISizedEvent} from '../../interfaces/interfaces';
import {ActionService} from '../action/action.service';
import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';
import {MessageService} from '../message/message.service';
import {MetadataService} from '../metadata/metadata.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root',
})

export class LoadModelService {

  private Subjects = {
    actualModel: new ReplaySubject<IModel>(),
    actualModelMeshes: new ReplaySubject<BABYLON.Mesh[]>(),
    actualCollection: new ReplaySubject<ICompilation | undefined>(),
  };

  public Observables = {
    actualModel: this.Subjects.actualModel.asObservable(),
    actualModelMeshes: this.Subjects.actualModelMeshes.asObservable(),
    actualCollection: this.Subjects.actualCollection.asObservable(),
  };

  private isLoaded = false;
  public isCollectionLoaded = false;
  public isDefaultModelLoaded = false;

  @Output() loaded: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionLoaded: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultModelLoaded: EventEmitter<boolean> = new EventEmitter();

  // TODO
  @Output() imagesource: EventEmitter<string> = new EventEmitter();

  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;
  public quality = 'low';

  private defaultModel: IModel = {
    _id: 'default',
    annotationList: [],
    relatedDigitalObject: { _id: 'default_model' },
    mediaType: 'model',
    name: 'Cube',
    dataSource: { isExternal: false },
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

  constructor(public babylonService: BabylonService,
              private actionService: ActionService,
              private cameraService: CameraService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              private mongohandlerService: MongohandlerService,
              private message: MessageService,
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
      this.mongohandlerService.getCompilation(collectionId)
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
    this.mongohandlerService.getModel(query)
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

  // TODO
  private isSizedEvent(e: any): e is ISizedEvent {
    return (e && e.width !== undefined && e.height !== undefined);
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

          image.onload = event => {
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
