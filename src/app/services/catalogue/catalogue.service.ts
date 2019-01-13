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

    models: new BehaviorSubject<Model[]>(Array<Model>()),
    collections: new BehaviorSubject<any[]>(Array<any>()),
  };

  public Observables = {
    models: this.Subjects.models.asObservable(),
    collections: this.Subjects.collections.asObservable(),
  };

  private unsortedModels: Model[];
  private isFirstLoad = true;

  constructor(private mongohandlerService: MongohandlerService,
              private loadModelService: LoadModelService,
              private message: MessageService) {
  }

  public bootstrap(): void {

    if (this.isFirstLoad) {

      // z.B. https://blacklodge.hki.uni-koeln.de:8065/models/testmodel/
      // ${environment.kompakkt_url}?model=${this.memory.modelPath}
      // Hinter dem ? komm der Pfad zum Modell
      const url_split = location.href.split('?');

      if (url_split.length <= 1) {
        this.isFirstLoad = false;
        this.loadModelService.loadDefaultModelData();
        this.fetchCollectionsData();
        this.fetchModelsData();
      }

      if (url_split.length > 1) {

        const equal_split = url_split[1].split('=');

        if (equal_split.length > 1) {

          const query = equal_split[1];
          const category = equal_split[0];

          // TODO: Cases for audio, video and image
          switch (category) {

            case 'model':
              this.loadModelService.fetchModelData({
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
              });
              this.isFirstLoad = false;
              break;
            case 'compilation':
              this.isFirstLoad = false;
              this.loadModelService.fetchCollectionData(query);
              break;

            default:
              this.isFirstLoad = false;
              console.log('No valid query passed. Loading default model.');
              this.loadModelService.loadDefaultModelData();
          }
        } else {
          console.log('No valid query passed. Loading default model.');
          this.isFirstLoad = false;
          this.loadModelService.loadDefaultModelData();
        }
      }
    } else {
      console.log('Page has already been initially loaded.');
    }
  }


  /*
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
  */

  private fetchCollectionsData() {
    this.mongohandlerService.getAllCompilations().subscribe(compilation => {
      this.Subjects.collections.next(compilation);
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  private fetchModelsData() {
    this.mongohandlerService.getAllModels().subscribe(model => {
      this.Subjects.models.next(model);
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  public selectCollection(collection: any) {
    this.loadModelService.updateActiveCollection(collection);
    this.loadModelService.loadSelectedModelfromCollection(collection.models[0]);
  }

  public selectModel(model: Model, collection: boolean) {
    if (collection) {
      this.loadModelService.loadSelectedModelfromCollection(model);
    } else {
      this.loadModelService.loadSelectedModelfromModels(model);
    }
  }

  public selectCollectionbyID(identifierCollection: string): boolean {
    let collection = this.Observables.collections.source['value'].find(i => i._id === identifierCollection);
    if (collection === undefined) {
      console.log('is undefined 1');
      /* TODO
      this.mongohandlerService.getCompilation(identifierCollection).subscribe(compilation => {
        collection = compilation;
      }, error => {
        this.message.error('Connection to object server refused.');
        collection = undefined;
      });
      */
      if (collection === undefined) {
        console.log('is undefined 2');
        return false;
      } else {
        console.log('is not undefined 1', collection);
        // this.Subjects.collections.next(collection);
        this.selectCollection(collection);
        return true;
      }
    } else {
      console.log('is not undefined 2', collection);
      this.selectCollection(collection);
      return true;
    }
  }

  public selectModelbyID(identifierModel: string): boolean {
    let model = this.Observables.models.source['value'].find(i => i._id === identifierModel);
    if (model !== undefined) {
      this.selectModel(model, false);
      return true;
    } else {
      // TODO
      // model = this.mongohandlerService.getModel(identifierModel);
      if (model !== undefined) {
        // this.Subjects.models.next(model);
        this.selectModel(model, false);
        return true;
      } else {
        return false;
      }
    }
  }


}
