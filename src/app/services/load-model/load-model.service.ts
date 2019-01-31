import {EventEmitter, Injectable, Output} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {BabylonService} from '../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../action/action.service';
import {CameraService} from '../camera/camera.service';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';
import {ReplaySubject} from 'rxjs';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {MessageService} from '../message/message.service';
import {MetadataService} from '../metadata/metadata.service';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
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

  private userOwnedModels: Array<any> = [];

  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;
  public quality = 'low';

  private defaultModel: Model;

  public isSingleLoadModel = true;
  public isSingleLoadCollection = true;
  public isDefaultLoad = true;
  public isModelOwner = false;

  @Output() singleCollection: EventEmitter<boolean> = new EventEmitter();
  @Output() singleModel: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultLoad: EventEmitter<boolean> = new EventEmitter();
  @Output() modelOwner: EventEmitter<boolean> = new EventEmitter();

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
      this.isSingleLoadModel = true;
      this.singleModel.emit(true);
      this.isDefaultLoad = false;
      this.defaultLoad.emit(false);
      this.quality = 'low';
      this.loadModel(resultModel);
    });
  }

  public fetchCollectionData(identifier: string) {
    this.isSingleLoadCollection = true;
    this.singleCollection.emit(true);
    this.isDefaultLoad = false;
    this.defaultLoad.emit(false);
    this.quality = 'low';
    this.mongohandlerService.getCompilation(identifier).then(compilation => {
      this.updateActiveCollection(compilation);
      this.loadModel(compilation.models[0]);
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  public loadDefaultModelData() {
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
          total: ''
        },
        low: 'assets/models/kompakkt.babylon',
        medium: 'assets/models/kompakkt.babylon',
        high: 'assets/models/kompakkt.babylon',
        raw: 'assets/models/kompakkt.babylon'
      }
    };
    this.loadModel(this.defaultModel, '');
    this.metadataService.addDefaultMetadata();
  }

  public loadSelectedModel(model: Model, collection: boolean) {
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
    this.loadModel(model);
  }

  public updateModelQuality(quality: string) {
    if (this.quality !== quality) {
      this.quality = quality;
      const _model = this.Observables.actualModel.source['_events'].slice(-1)[0];
      if (_model.processed[this.quality] !== undefined) {
        this.loadModel(_model);
      } else {
        this.message.error('Model quality is not available.');
      }
    } else {
      return;
    }
  }

  public async loadModel(newModel: Model, overrideUrl?: string) {
    const URL = (overrideUrl !== undefined) ? overrideUrl : this.baseUrl;

    if (this.userOwnedModels.length === 0) {
      await this.getUserData();
    }

    if (!this.loadingScreenHandler.isLoading) {
      this.babylonService.loadModel(URL, newModel.processed[this.quality]).then(async (model) => {
        // Warte auf Antwort von loadModel, da loadModel ein Promise<object> von ImportMeshAync übergibt
        // model ist hier das neu geladene Model
        this.updateActiveModel(newModel);
        this.updateActiveModelMeshes(model.meshes);

        // Zentriere auf das neu geladene Model, bevor die SettingsEinstellung übernommen wird
        this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);

        this.checkOwnerState(newModel._id);
      });


    }
  }

  public async getUserData() {
    return new Promise((resolve, reject) => {
      this.mongohandlerService.getCurrentUserData().then(userData => {
        if (userData.data.models.length > 0) {
          this.userOwnedModels = userData.data.models;
        } else {
          console.log('User owns no models.');
        }
        resolve();
      }, error => {
        this.message.error('Connection to object server refused.');
        reject();
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

}
