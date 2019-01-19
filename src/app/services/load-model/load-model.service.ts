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
    actualModelMesh: new ReplaySubject<BABYLON.Mesh>(),
    actualCollection: new ReplaySubject<any>(),
  };

  public Observables = {
    actualModel: this.Subjects.actualModel.asObservable(),
    actualModelMesh: this.Subjects.actualModelMesh.asObservable(),
    actualCollection: this.Subjects.actualCollection.asObservable(),
  };

  private baseUrl = `${environment.express_server_url}:${environment.express_server_port}/`;
  public quality = 'low';

  private defaultModel: Model;

  public isSingleLoadModel = true;
  public isSingleLoadCollection = true;
  public isDefaultLoad = true;

  @Output() singleCollection: EventEmitter<boolean> = new EventEmitter();
  @Output() singleModel: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultLoad: EventEmitter<boolean> = new EventEmitter();

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

  public updateActiveModelMesh(mesh: BABYLON.Mesh) {
    this.Subjects.actualModelMesh.next(mesh);
  }

  public fetchModelData(query: string) {
    this.mongohandlerService.getModel(query).toPromise().then(resultModel => {
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
    this.mongohandlerService.getCompilation(identifier).subscribe(compilation => {
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
      if (this.Observables.actualModel.source['value'].processed[this.quality] !== undefined) {
        this.loadModel(this.Observables.actualModel.source['value']);
      } else {
        this.message.error('Model quality is not available.');
      }
    } else {
      return;
    }
  }

  public loadModel(newModel: Model, overrideUrl?: string) {
    const URL = (overrideUrl !== undefined) ? overrideUrl : this.baseUrl;

    if (!this.loadingScreenHandler.isLoading) {
      this.babylonService.loadModel(URL, newModel.processed[this.quality]).then(async (model) => {
        // Warte auf Antwort von loadModel, da loadModel ein Promise<object> von ImportMeshAync übergibt
        // model ist hier das neu geladene Model
        this.updateActiveModel(newModel);
        this.updateActiveModelMesh(model.meshes[0]);

        // Zentriere auf das neu geladene Model, bevor die SettingsEinstellung übernommen wird
        this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);
      });


    }
  }
}
