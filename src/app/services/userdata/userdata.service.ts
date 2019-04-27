import {EventEmitter, Injectable, Output} from '@angular/core';

import {IAnnotation, ICompilation, IUserData, ILoginData, IModel} from '../../interfaces/interfaces';
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

  public personalCollections: ICompilation[] = [];
  public userOwnedModels: IModel[] = [];
  public userOwnedFinishedModels: IModel[] = [];
  public userOwnedAnnotations: IAnnotation[] = [];

  public currentUserData: IUserData = {
    fullname: 'Guest',
    username: 'guest',
    _id: 'guest',
  };

  public socketUserData: IUserData = {
    fullname: 'Guest',
    username: 'guest',
    _id: 'guest',
  };

  public cachedLoginData: ILoginData = {
    password: '',
    username: '',
  };

  private loggedIn = false;

  constructor(private catalogueService: CatalogueService,
              private loadModelService: LoadModelService,
              private mongoService: MongohandlerService,
              private message: MessageService) {
    this.getUserData()
      .then(() => console.log('Logged in user with sessionID cookie', this.currentUserData))
      .catch(() => console.log('No session cookie. User not logged in'));

    this.catalogueService.firstLoad.subscribe(firstLoad => {
      if (firstLoad) {
        this.initUserDataForSocket();
      }
    });

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
      if (!actualCollection) return;
      if (actualCollection._id && actualCollection.relatedOwner) {
        if (actualCollection.relatedOwner._id && this.loggedIn && this.currentUserData._id) {
          if (this.currentUserData._id !== 'guest') {
            if (actualCollection.relatedOwner._id === this.currentUserData._id) {
              this.isCollectionOwner = true;
            } else {
              this.isCollectionOwner = false;
            }
          } else {
            this.isCollectionOwner = false;
          }
        } else {
          this.isCollectionOwner = false;
        }
      } else {
        this.isCollectionOwner = false;
      }
      this.collectionOwner.emit(this.isCollectionOwner);
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
            if (!userData.data) return;
            if (userData.data.model) {
              userData.data.model.forEach((model: IModel | null) => {
                if (model !== null && !this.userOwnedModels.find(_m => _m._id === model._id)) {
                  this.userOwnedModels.push(model);
                  if (model.finished) {
                    this.userOwnedFinishedModels.push(model);
                  }
                }
              });
            }
            if (userData.data.compilation) {
              userData.data.compilation.forEach((compilation: ICompilation | null) => {
                if (compilation !== null && !this.personalCollections.find(_c => _c._id === compilation._id)) {
                  this.personalCollections.push(compilation);
                }
              });
            }
            if (userData.data.annotation) {
              userData.data.annotation.forEach((annotation: IAnnotation | null) => {
                if (annotation !== null && !this.userOwnedAnnotations.find(_a => _a._id === annotation._id)) {
                  this.userOwnedAnnotations.push(annotation);
                }
              });
            }
          }
          console.log('Meine Modelle', this.userOwnedFinishedModels, 'compis', this.personalCollections, 'meine Annos', this.userOwnedAnnotations);
        }, error => {
          this.message.error('Connection to object server refused.');
          reject('Connection to object server refused.');
        });
    });
  }

  private checkOwnerState(identifier: string) {
    if (this.userOwnedModels.find(obj => obj && obj._id === identifier)) {
      this.isModelOwner = true;
      this.modelOwner.emit(true);
    } else {
      this.isModelOwner = false;
      this.modelOwner.emit(false);
    }
  }

  public isAnnotationOwner(annotation: IAnnotation): boolean {
    return annotation._id && this.loggedIn && this.currentUserData._id !== 'guest' ?
      this.currentUserData._id === annotation.creator._id : false;
  }

  public setcachedLoginData(pwd: string, user: string) {
    this.cachedLoginData.password = pwd;
    this.cachedLoginData.username = user;
  }

  public getUserDataForSocket(): any {
    return this.currentUserData._id !== 'guest' ?
      this.currentUserData : this.socketUserData._id;
  }

  public initUserDataForSocket() {
    this.socketUserData = this.currentUserData._id !== 'guest' ? this.currentUserData :
      this.socketUserData = {
        fullname: 'Kompakkt Cat',
        username: 'komkcat',
        _id: this.mongoService.generateObjectId(),
      };
  }
}
