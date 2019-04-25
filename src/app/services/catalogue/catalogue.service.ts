import {EventEmitter, Injectable, Output} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

import {Model} from '../../interfaces/model/model.interface';
import {LoadModelService} from '../load-model/load-model.service';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root',
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

  constructor(private mongoHandlerService: MongohandlerService,
              private loadModelService: LoadModelService,
              private message: MessageService) {
  }

  public bootstrap(): void {
    if (!this.isFirstLoad) {
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
    this.isFirstLoad = false;

    // Use case 1: load viewer (all available objects and collections)
    if (!modelParam && !compParam) {
      this.isSingleObject = false;
      this.singleObject.emit(false);
      this.isSingleCollection = false;
      this.singleCollection.emit(false);

      this.isShowCatalogue = true;
      this.showCatalogue.emit(true);

      this.loadModelService.loadDefaultModelData();
      this.isDefaultLoad = true;
      this.defaultLoad.emit(true);

      this.mongoHandlerService.isAuthorized()
        .then(result => {
          if (result.status === 'ok') {
            this.isLoggedIn = true;
            this.loggedIn.emit(true);

            this.fetchCollectionsData();
            this.fetchModelsData();
          } else {
            this.isLoggedIn = false;
            this.loggedIn.emit(false);
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

    // Use case: load viewer with single object (2) or single collection (3)
    if (url_split.length > 1) {

      const equal_split = url_split[1].split('=');

      if (equal_split.length > 1) {

        const query = equal_split[1];
        const category = equal_split[0];

        switch (category) {
          // Use case: single collection (3)
          case 'model':

            this.isSingleObject = true;
            this.singleObject.emit(true);
            this.isSingleCollection = false;
            this.singleCollection.emit(false);
            this.isShowCatalogue = false;
            this.showCatalogue.emit(false);

            this.isDefaultLoad = false;
            this.defaultLoad.emit(false);

            this.mongoHandlerService.isAuthorized()
              .then(result => {
                if (result.status === 'ok') {
                  this.isLoggedIn = true;
                  this.loggedIn.emit(true);
                  this.selectModel(query, false);
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
            break;

          case 'compilation':

            this.isSingleObject = false;
            this.singleObject.emit(false);
            this.isSingleCollection = true;
            this.singleCollection.emit(true);
            this.isShowCatalogue = true;
            this.showCatalogue.emit(true);

            this.isDefaultLoad = false;
            this.defaultLoad.emit(false);

            this.mongoHandlerService.isAuthorized()
              .then(result => {
                if (result.status === 'ok') {
                  this.isLoggedIn = true;
                  this.loggedIn.emit(true);
                  this.selectCollection(query);
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
            break;

          default:
            this.isShowCatalogue = true;
            this.showCatalogue.emit(true);
            this.isSingleObject = false;
            this.singleObject.emit(false);
            this.isSingleCollection = false;
            this.singleCollection.emit(false);
            console.log('No valid query passed. Loading default model.');
            this.loadModelService.loadDefaultModelData();
            this.isDefaultLoad = true;
            this.defaultLoad.emit(true);
            this.mongoHandlerService.isAuthorized()
              .then(result => {
                if (result.status === 'ok') {
                  this.isLoggedIn = true;
                  this.loggedIn.emit(true);
                  this.fetchCollectionsData();
                  this.fetchModelsData();
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
        }
      } else {
        this.isShowCatalogue = true;
        this.showCatalogue.emit(true);
        this.isSingleObject = false;
        this.singleObject.emit(false);
        this.isSingleCollection = false;
        this.singleCollection.emit(false);
        console.log('No valid query passed. Loading default model.');
        this.loadModelService.loadDefaultModelData();
        this.isDefaultLoad = true;
        this.defaultLoad.emit(true);
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
      }
    }
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
      .then(model => {
        this.Subjects.models.next(model);
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
            this.Subjects.models.next(actualModel);
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
