import {Injectable} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {BehaviorSubject} from 'rxjs';
import {LoadModelService} from '../load-model/load-model.service';
import {MessageService} from '../message/message.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogueService {

  private Subjects = {

    model: new BehaviorSubject<Model>(null),
    quality: new BehaviorSubject<string>('low'),
    models: new BehaviorSubject<Model[]>(Array<Model>()),
    modelMetadata: new BehaviorSubject<string>(null),

    collection: new BehaviorSubject<any>(null),
    collections: new BehaviorSubject<any[]>(Array<any>())

  };

  public Observables = {
    model: this.Subjects.model.asObservable(),
    quality: this.Subjects.quality.asObservable(),
    models: this.Subjects.models.asObservable(),
    modelMetadata: this.Subjects.modelMetadata.asObservable(),

    collection: this.Subjects.collection.asObservable(),
    collections: this.Subjects.collections.asObservable()

  };

  private unsortedModels: Model[];
  private isFirstLoad = true;
  public isInitialLoad = true;
  public receivedDigitalObject = false;
  public metadata = null;
  private initialModel: Model;


  constructor(private mongohandlerService: MongohandlerService,
              private loadModelService: LoadModelService,
              private message: MessageService) {
  }

  public bootstrap(): void {

    if (this.isInitialLoad) {

      this.initialModel = {
        _id: 'kompakkt',
        name: 'kompakkt',
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
      // this.Subjects.model.next(model);
      this.loadModelService.loadModel(this.initialModel, 'low', true);

      // this.Subjects.models.next(this.initialModel);

    } else {
      // TODO: Cleanup
      const url_split = location.href.split('?');

      if (this.isFirstLoad && url_split.length > 1) {

        const equal_split = url_split[1].split('=');

        if (equal_split.length > 1) {

          const query = equal_split[1];
          const category = equal_split[0];

          console.log(category + ' ' + query);

          // TODO: Cases for audio, video and image
          switch (category) {

            case 'model':

              // TODO: pass metadata in query
              // TODO: load metadata if available
              this.updateQuality('low');

              this.loadModelService.loadModel({
                _id: 'PreviewModel',
                name: 'PreviewModel',
                finished: false,
                online: false,
                files: [
                  query
                ],
                processed: {
                  time: {
                    start: '',
                    end: '',
                    total: ''
                  },
                  low: query,
                  medium: query,
                  high: query,
                  raw: query
                }
              }, 'low');
              break;
            case 'compilation':
              this.fetchData(query);
              break;
            default:
              console.log('No valid query passed. Loading test compilation');
              this.fetchData();
          }
        } else {
          console.log('No valid query passed. Loading test compilation');
          this.fetchData();
        }
      } else {
        console.log('No valid query passed. Loading test compilation');
        this.fetchData();
      }
    }
  }

  public updateQuality(quality: string) {
    this.Subjects.quality.next(quality);
  }

  public updateActiveModel(model: Model) {
    this.Subjects.model.next(model);
    this.fetchMetadata(model.relatedDigitalObject['_id']);
  }

  public updateMetadata(metadata: string) {
    this.Subjects.modelMetadata.next(metadata);
    this.metadata = metadata;
  }

  public initializeCatalogue() {

    let models = this.Observables.models.source['value'];

    this.unsortedModels = models.slice(0);
    models.splice(0, models.length);
    models = this.unsortedModels.slice(0);

    models.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });

    this.Subjects.models.next(models);
  }

  public fetchData(compilation_id?: string) {

    if (compilation_id === undefined) {
      compilation_id = 'testcompilation';
    }

    this.mongohandlerService.getCompilation(compilation_id).subscribe(compilation => {

      if (compilation.models.length > 0) {

        this.Subjects.models.next(compilation.models);
        if (this.isFirstLoad) {

          this.updateActiveModel(compilation.models[0]);
          this.isFirstLoad = false;
        }
      }
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  private fetchMetadata(metadata_id?: string) {

    this.mongohandlerService.getModelMetadata(metadata_id).subscribe(result => {

      this.updateMetadata(result);
      this.receivedDigitalObject = true;
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  public fetchCollectionData() {
    this.mongohandlerService.getAllCompilations().subscribe(compilation => {
      this.Subjects.collections.next(compilation);
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  public fetchModelData() {
    this.mongohandlerService.getAllModels().subscribe(model => {
      this.Subjects.models.next(model);
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

}
