import {EventEmitter, Injectable, Output} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

import {IModel} from '../../interfaces/interfaces';
import {LoadModelService} from '../load-model/load-model.service';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {OverlayService} from '../overlay/overlay.service';

@Injectable({
  providedIn: 'root',
})

export class CatalogueService {

  // TODO: ReplaySubjects
  private Subjects = {
    models: new BehaviorSubject<IModel[]>(Array<IModel>()),
    collections: new BehaviorSubject<any[]>(Array<any>()),
  };

  public Observables = {
    models: this.Subjects.models.asObservable(),
    collections: this.Subjects.collections.asObservable(),
  };

  private isFirstLoad = true;
  private isLoggedIn: boolean;
  public isShowCatalogue: boolean;
  private isSingleObject: boolean;
  private isSingleCollection: boolean;
  private isDefaultLoad: boolean;

  @Output() loggedIn: EventEmitter<boolean> = new EventEmitter();
  @Output() showCatalogue: EventEmitter<boolean> = new EventEmitter();
  @Output() singleObject: EventEmitter<boolean> = new EventEmitter();
  @Output() singleCollection: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultLoad: EventEmitter<boolean> = new EventEmitter();
  @Output() firstLoad: EventEmitter<boolean> = new EventEmitter();

  constructor(private mongoHandlerService: MongohandlerService,
              private loadModelService: LoadModelService,
              private message: MessageService,
              private overlayService: OverlayService) {
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

    this.firstLoad.emit(true);
    this.isFirstLoad = false;

    this.isSingleObject = false;
    this.isSingleCollection = false;
    this.isShowCatalogue = false;
    this.isDefaultLoad = false;

    if (!modelParam && !compParam) {
      this.isDefaultLoad = true;
      this.isShowCatalogue = true;
    }

    if (modelParam && !compParam) {
      this.isSingleObject = true;
    }

    if (!modelParam && compParam) {
      this.isSingleCollection = true;
    }

    if (modelParam && compParam) {
      // TODO: Load model in compilation?
      this.isSingleCollection = true;
    }

    this.defaultLoad.emit(this.isDefaultLoad);
    this.singleObject.emit(this.isSingleObject);
    this.showCatalogue.emit(this.isShowCatalogue);
    this.singleCollection.emit(this.isSingleCollection);

    if (this.isDefaultLoad) {
      this.loadModelService.loadDefaultModelData();
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

        if (this.isSingleObject && modelParam) {
          this.selectModel(modelParam, false);
        } else if (this.isSingleCollection && compParam) {
          this.selectCollection(compParam);
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

  public selectCollection(collectionId: string) {
    this.isDefaultLoad = false;
    this.defaultLoad.emit(false);
    this.loadModelService.fetchAndLoad(undefined, collectionId, undefined);
  }

  public selectModel(modelId: string, collection?: boolean) {
    this.isDefaultLoad = false;
    this.defaultLoad.emit(false);
    this.loadModelService.fetchAndLoad(modelId, undefined, collection ? collection : undefined);
  }

  /**
   * function selectCollectionByID looks up a collection by a given identifier
   *
   * param {string} identifierCollection,
   * returns {boolean} collection has been found
   */
  public async selectCollectionByID(identifierCollection: string): Promise<any> {
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
      this.selectCollection(collection._id);
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
            this.selectModel(actualModel._id, false);
            return true;
          } else {
            return false;
          }
        },    error => {
          this.message.error('Connection to object server refused.');
          return false;
        });
    }
    this.selectModel(model._id, false);
    return true;
  }

  public addAndLoadCollection(compilation: any) {
    // this.Subjects.collections.next(compilation);
    // TODO
    this.selectCollection(compilation._id);
  }

}
