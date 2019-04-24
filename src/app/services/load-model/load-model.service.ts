import {EventEmitter, Injectable, Output} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {ReplaySubject} from 'rxjs';

import {environment} from '../../../environments/environment';
import {Model} from '../../interfaces/model/model.interface';
import {SizedEvent} from '../../interfaces/sizedEvent/sizedEvent';
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
    actualModel: new ReplaySubject<Model>(),
    actualModelMeshes: new ReplaySubject<BABYLON.Mesh[]>(),
    actualCollection: new ReplaySubject<any>(),
  };

  public Observables = {
    actualModel: this.Subjects.actualModel.asObservable(),
    actualModelMeshes: this.Subjects.actualModelMeshes.asObservable(),
    actualCollection: this.Subjects.actualCollection.asObservable(),
  };

  public isLoaded = false;

  @Output() loaded: EventEmitter<boolean> = new EventEmitter();
  // TODO
  @Output() imagesource: EventEmitter<string> = new EventEmitter();

  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;
  public quality = 'low';

  private defaultModel = {
    _id: 'Cube',
    relatedDigitalObject: {_id: 'default_model'},
    mediaType: 'model',
    name: 'Cube',
    dataSource: {isExternal: false},
    cameraPosition: [{dimension: 'x', value: 0},
                     {dimension: 'y', value: 0},
                     {dimension: 'z', value: 0}],
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
        this.updateActiveCollection({});
      }
    }
    if (collectionId) {
      this.mongohandlerService.getCompilation(collectionId)
        .then(compilation => {
          compilation.models = compilation.models.filter(obj => obj);
          this.updateActiveCollection(compilation);
          this.fetchModelData(compilation.models[0]._id);
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
  private isSizedEvent(e: any): e is SizedEvent {
    return (e && e.width !== undefined && e.height !== undefined);
  }

  public async loadModel(newModel: Model, overrideUrl?: string) {
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
      const _model = this.getCurrentModel();
      if (_model.processed[this.quality] !== undefined) {
        this.loadModel(_model._id === 'Cube' ? _model : this.defaultModel, '')
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
