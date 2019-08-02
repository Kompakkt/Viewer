import {EventEmitter, Injectable, Output} from '@angular/core';

// tslint:disable-next-line:max-line-length
import {IAnnotation, ICompilation, IEntity, ILDAPData, ILoginData, IUserData} from '../../interfaces/interfaces';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {ProcessingService} from '../processing/processing.service';

@Injectable({
  providedIn: 'root',
})
export class UserdataService {

  public isEntityOwner = false;
  public isCollectionOwner = false;

  @Output() entityOwner: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionOwner: EventEmitter<boolean> = new EventEmitter();

  public personalCollections: ICompilation[] = [];
  public userOwnedEntities: IEntity[] = [];
  public userOwnedFinishedEntities: IEntity[] = [];
  public userOwnedAnnotations: IAnnotation[] = [];

  public currentUserData: IUserData | ILDAPData = {
    fullname: 'Guest',
    username: 'guest',
    _id: this.mongoService.generateEntityId(),
  };

  public cachedLoginData: ILoginData = {
    password: '',
    username: '',
  };

  private loggedIn = false;

  constructor(private processingService: ProcessingService,
              private mongoService: MongohandlerService,
              private message: MessageService) {
    // this.currentUserData can either be IUserData or ILDAPData, so check if it's ILDAPData
    const isLDAPUser = (obj: any): obj is ILDAPData => {
      return obj.data !== undefined;
    };

    this.processingService.loggedIn.subscribe(loggedIn => {
      this.loggedIn = loggedIn;
      this.getUserData()
        .then(() => console.log('Logged in as user:', this.currentUserData))
        .catch(() => console.warn('Not logged in'));
    });

    this.processingService.Observables.actualEntity.subscribe(actualEntity => {
      if (actualEntity._id && this.userOwnedEntities.length && this.loggedIn) {
        this.checkOwnerState(actualEntity._id);
      } else {
        this.isEntityOwner = false;
        this.entityOwner.emit(false);
      }
    });

    this.processingService.Observables.actualCollection.subscribe(actualCollection => {
      if (actualCollection && actualCollection._id && actualCollection.relatedOwner) {
        this.isCollectionOwner =
          (isLDAPUser(this.currentUserData) && this.currentUserData.data.compilation)
            ? (this.currentUserData.data.compilation
              .filter(comp => comp) as ICompilation[])
              .find(comp => comp._id === actualCollection._id) !== undefined
            : false;
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
            this.currentUserData = {
              fullname: 'Guest', username: 'guest',
              _id: this.mongoService.generateEntityId(),
            };
          } else if (!userData || !userData.data) {
            this.message.info('No valid userdata received');
            this.currentUserData = {
              fullname: 'Guest', username: 'guest',
              _id: this.mongoService.generateEntityId(),
            };
          } else {
            this.currentUserData = userData;
            this.message.info(`Logged in as ${this.currentUserData.fullname}`);
            if (!userData.data) {
              console.warn('User has no data property', userData, this);
              return;
            }
            if (userData.data.entity) {
              (userData.data.entity.filter(entity => entity) as IEntity[])
                .forEach(entity => {
                  if (!this.userOwnedEntities.find(_m => _m._id === entity._id)) {
                    this.userOwnedEntities.push(entity);
                    if (entity.finished) {
                      this.userOwnedFinishedEntities.push(entity);
                    }
                  }
                });
            }
            if (userData.data.compilation) {
              (userData.data.compilation.filter(comp => comp) as ICompilation[])
                .forEach(compilation => {
                  if (!this.personalCollections.find(_c => _c._id === compilation._id)) {
                    this.personalCollections.push(compilation);
                  }
                });
            }
            if (userData.data.annotation) {
              (userData.data.annotation.filter(ann => ann) as IAnnotation[])
                .forEach(annotation => {
                  if (!this.userOwnedAnnotations.find(_a => _a._id === annotation._id)) {
                    this.userOwnedAnnotations.push(annotation);
                  }
                });
            }
          }
          console.log('Meine Entityle', this.userOwnedFinishedEntities, 'compis', this.personalCollections, 'meine Annos', this.userOwnedAnnotations);
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to entity server refused.');
          reject('Connection to entity server refused.');
        });
    });
  }

  private checkOwnerState(identifier: string) {
    if (['dragdrop'].includes(identifier)) return true;

    if (this.userOwnedEntities.find(obj => obj && obj._id === identifier)) {
      this.isEntityOwner = true;
      this.entityOwner.emit(true);
    } else {
      this.isEntityOwner = false;
      this.entityOwner.emit(false);
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
    if (this.currentUserData.fullname !== 'Guest') {
      return this.currentUserData;
    } else {
      // TODO better names for guests
      return {
        fullname: 'Guest',
        username: 'guest',
        _id: this.currentUserData._id,
      };
    }
  }
}
