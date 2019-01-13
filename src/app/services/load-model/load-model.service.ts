import {EventEmitter, Injectable, Output} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {BabylonService} from '../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../action/action.service';
import {AnnotationService} from '../annotation/annotation.service';
import {CameraService} from '../camera/camera.service';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {MessageService} from '../message/message.service';
import {MetadataService} from '../metadata/metadata.service';

@Injectable({
  providedIn: 'root'
})

export class LoadModelService {

  private Subjects = {
    actualModel: new BehaviorSubject<Model>(null),
    actualCollection: new BehaviorSubject<any>(null),
  };

  public Observables = {
    actualModel: this.Subjects.actualModel.asObservable(),
    actualCollection: this.Subjects.actualCollection.asObservable(),
  };

  private baseUrl: string;
  public isDefaultLoad = false;
  public quality = 'low';

  private defaultModel: Model;

  public isSingleLoadModel = false;
  public isSingleLoadCollection = false;

  @Output() singleCollection: EventEmitter<boolean> = new EventEmitter();
  @Output() singleModel: EventEmitter<boolean> = new EventEmitter();

  constructor(public babylonService: BabylonService,
              private actionService: ActionService,
              private annotationService: AnnotationService,
              private cameraService: CameraService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              private mongohandlerService: MongohandlerService,
              private message: MessageService,
              private metadataService: MetadataService) {
  }

  public updateActiveModel(model: Model) {
    this.Subjects.actualModel.next(model);
  }

  public updateActiveCollection(collection: any) {
    this.Subjects.actualCollection.next(collection);
  }

  public fetchModelData(model: Model) {
    this.isSingleLoadModel = true;
    this.singleModel.emit(true);
    this.isDefaultLoad = false;
    this.baseUrl = 'https://blacklodge.hki.uni-koeln.de:8065/';
    this.quality = 'low';
    this.loadModel(model);
  }

  public fetchCollectionData(identifier: string) {
    this.isSingleLoadCollection = true;
    this.singleCollection.emit(true);
    this.isDefaultLoad = false;
    this.baseUrl = 'https://blacklodge.hki.uni-koeln.de:8065/';
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
    this.isSingleLoadModel = false;
    this.singleModel.emit(false);
    this.isSingleLoadCollection = false;
    this.singleCollection.emit(false);
    this.quality = 'low';
    this.baseUrl = '';
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
    this.loadModel(this.defaultModel);
    this.metadataService.addDefaultMetadata();
  }

  public loadSelectedModel(model: Model, collection: boolean) {
    this.isDefaultLoad = false;
    this.isSingleLoadModel = false;
    this.singleModel.emit(false);
    this.isSingleLoadCollection = false;
    this.singleCollection.emit(false);
    if (!collection) {
      this.updateActiveCollection([]);
    }
    this.baseUrl = 'https://blacklodge.hki.uni-koeln.de:8065/';
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

  public loadModel(newModel: Model) {

    this.updateActiveModel(newModel);

    if (!this.loadingScreenHandler.isLoading) {
      this.babylonService.loadModel(this.baseUrl, newModel.processed[this.quality]).then(async (model) => {

        // Warte auf Antwort von loadModel, da loadModel ein Promise<object> von ImportMeshAync übergibt
        // model ist hier das neu geladene Model, aus dem wir direkt den Namen nehmen können

        // Zentriere auf das neu geladene Model oder (falls gesetzt) wähle die default Position
        this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);

        /* TODO
        if (newModel.cameraPosition[0].value !== undefined && newModel.cameraPosition[1].value
          !== undefined && newModel.cameraPosition[2].value !== undefined) {

          if (newModel.cameraPosition[0].value === 0 && newModel.cameraPosition[1].value === 0 && newModel.cameraPosition[2].value === 0) {
            this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);
          } else {
            const cameraVector = new BABYLON.Vector3(newModel.cameraPosition[0].value,
              newModel.cameraPosition[1].value, newModel.cameraPosition[2].value);
            this.cameraService.moveCameraToTarget(cameraVector);
          }
        } else {
          this.cameraService.setActiveCameraTarget(model.meshes[0]._boundingInfo.boundingBox.centerWorld);
        }
        */

        // Füge Tags hinzu und lade Annotationen
        BABYLON.Tags.AddTagsTo(model.meshes[0], newModel.name);
        this.annotationService.loadAnnotations(newModel.name);
      });
    }
  }
}
