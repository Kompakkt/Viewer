import {EventEmitter, Injectable, Output} from '@angular/core';

import {Annotation} from '../../interfaces/annotation2/annotation2';
import {CatalogueService} from '../catalogue/catalogue.service';
import {LoadModelService} from '../load-model/load-model.service';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root',
})
export class UserdataService {

  public isModelOwner: boolean;
  public isCollectionOwner: boolean;

  @Output() modelOwner: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionOwner: EventEmitter<boolean> = new EventEmitter();

  public personalCollections: any[] = [];
  public userOwnedModels: any[] = [];
  public userOwnedFinishedModels: any[] = [];
  public userOwnedAnnotations: any[] = [];

  public currentUserData: any = {
    fullname: 'Guest',
    username: 'guest',
    _id: 'guest',
  };

  public cachedLoginData: any = {
    password: '',
    username: '',
  };

  private loggedIn = false;

  constructor(private catalogueService: CatalogueService,
              private loadModelService: LoadModelService,
              private mongoService: MongohandlerService,
              private message: MessageService) {

    this.catalogueService.loggedIn.subscribe(loggedIn => {
      this.loggedIn = loggedIn;
      if (loggedIn) {
        this.getUserData();
      }
    });

    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      if (actualModel._id && this.userOwnedModels.length && this.loggedIn) {
        this.checkOwnerState(actualModel._id);
      } else {
        this.isModelOwner = false;
        this.modelOwner.emit(false);
      }
    });

    this.loadModelService.Observables.actualCollection.subscribe(actualCollection => {
      if (actualCollection._id) {
        if (actualCollection.relatedOwner._id && this.loggedIn && this.currentUserData._id) {
          if (this.currentUserData._id !== 'guest') {
            if (actualCollection.relatedOwner._id === this.currentUserData._id) {
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
        } else {
          this.isCollectionOwner = false;
          this.collectionOwner.emit(false);
        }
      } else {
        this.isCollectionOwner = false;
        this.collectionOwner.emit(false);
      }
    });
  }

  private async getUserData() {
    return new Promise((resolve, reject) => {
      this.mongoService.getCurrentUserData()
        .then(userData => {
          resolve(userData);
          if (userData && userData.message === 'Invalid session') {
            this.message.info('User is not logged in');
          } else if (!userData || !userData.data) {
            this.message.info('No valid userdata received');
          } else {
            this.currentUserData = userData;
            if (userData.data && userData.data.model) {
              userData.data.model.forEach(model => {
                if (model !== null) {
                  this.userOwnedModels.push(model);
                  if (model.finished) {
                    this.userOwnedFinishedModels.push(model);
                  }
                }
              });
            }
            if (userData.data && userData.data.compilation) {
              userData.data.compilation.forEach(compilation => {
                if (compilation !== null) {
                  this.personalCollections.push(compilation);
                }
              });
            }
            if (userData.data && userData.data.annotation) {
              userData.data.annotation.forEach(annotation => {
                if (annotation !== null && annotation !== '') {
                  this.userOwnedAnnotations.push(annotation);
                }
              });
            }
          }
          console.log('Meine Modelle', this.userOwnedFinishedModels, 'compis', this.personalCollections, 'meine Annos', this.userOwnedAnnotations);
        },    error => {
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

  public isAnnotationOwner(annotation: Annotation): boolean {
    if (annotation._id && this.loggedIn && this.currentUserData._id) {
      if (this.currentUserData._id !== 'guest') {
        return this.currentUserData._id === annotation.creator._id;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  public setcachedLoginData(pwd: string, user: string) {
    this.cachedLoginData.password = pwd;
    this.cachedLoginData.username = user;
  }

}
