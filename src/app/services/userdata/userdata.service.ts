import { EventEmitter, Injectable, Output } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import {
  IAnnotation,
  ICompilation,
  IEntity,
  ILDAPData,
} from '../../interfaces/interfaces';
import { MongohandlerService } from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root',
})
export class UserdataService {
  public loginData: {
    username: string;
    password: string;
    isCached: boolean;
  } = {
    username: '',
    password: '',
    isCached: false,
  };

  private userData: ILDAPData | undefined;
  private userDataSubject = new ReplaySubject<ILDAPData>();
  public userDataObservable = this.userDataSubject.asObservable();

  private isUserAuthenticatedSubject = new ReplaySubject<boolean>();
  public isUserAuthenticatedObservable = this.isUserAuthenticatedSubject.asObservable();

  public isEntityOwner = false;
  public isCollectionOwner = false;
  public isWhitelistMember = false;
  @Output() entityOwner: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionOwner: EventEmitter<boolean> = new EventEmitter();
  @Output() whitelistMember: EventEmitter<boolean> = new EventEmitter();

  public userOnWhitelistCollections: ICompilation[] = [];
  public userOwnedFinishedEntities: IEntity[] = [];

  constructor(private mongoService: MongohandlerService) {
    this.isAuthorized();
  }

  private isAuthorized() {
    this.mongoService
      .isAuthorized()
      .then(result => {
        console.log(result);
        if (result.status === 'ok') {
          this.userData = result;
          this.userDataSubject.next(result);
          this.isUserAuthenticatedSubject.next(true);
          this.findUserInCompilations();
          this.getUserOwnedFinishedEntities();
        } else {
          this.clearUserData();
        }
      })
      .catch(err => {
        console.error(err);
        this.clearUserData();
      });
  }

  public async attemptLogin(
    username: string,
    password: string,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.mongoService
        .login(username, password)
        .then(result => {
          if (result.status === 'ok') {
            this.userDataSubject.next(result);
            this.loginData = {
              username,
              password,
              isCached: true,
            };
            this.isUserAuthenticatedSubject.next(true);
            this.findUserInCompilations();
            this.getUserOwnedFinishedEntities();
            resolve(true);
          } else {
            this.isUserAuthenticatedSubject.next(false);
            this.clearUserData();
            resolve(false);
          }
        })
        .catch(err => {
          console.error(err);
          this.isUserAuthenticatedSubject.next(false);
          this.clearUserData();
          reject(false);
        });
    });
  }

  public logout() {
    this.mongoService
      .logout()
      .then(() => {})
      .catch(err => console.error(err));
    this.loginData = {
      username: '',
      password: '',
      isCached: false,
    };
    this.clearUserData();
  }

  private clearUserData() {
    this.userData = undefined;
    this.userDataSubject.next(undefined);
    this.isUserAuthenticatedSubject.next(false);
    this.isEntityOwner = false;
    this.entityOwner.emit(false);
    this.isCollectionOwner = false;
    this.collectionOwner.emit(false);
    this.isWhitelistMember = false;
    this.whitelistMember.emit(false);
    this.userOnWhitelistCollections.length = 0;
    this.userOwnedFinishedEntities.length = 0;
  }

  public isAnnotationOwner(annotation: IAnnotation): boolean {
    return this.userData ? this.userData._id === annotation.creator._id : false;
  }

  public checkEntityOwnerState(entity: IEntity) {
    const isOwner = (this.userData && this.userData.data
        && this.userData.data.entity && this.userData.data.entity[entity._id]) != undefined;

    this.isEntityOwner = ['dragdrop'].includes(entity._id) ? true : isOwner;
    this.entityOwner.emit(['dragdrop'].includes(entity._id) ? true : isOwner);
  }

  public checkCollectionOwnerState(collection: ICompilation) {
    const isOwner = (this.userData && this.userData.data && this.userData.data.compilation
        && this.userData.data.compilation[collection._id]) != undefined;
    this.isCollectionOwner = isOwner;
    this.collectionOwner.emit(isOwner);
  }

  public checkOccurenceOnWhitelist(collection: ICompilation) {
    let isOccuring = false;
    if (
      collection.whitelist.enabled &&
      this.userOnWhitelistCollections.length
    ) {
      this.userOnWhitelistCollections.forEach(userCollection => {
        if (userCollection._id === collection._id) {
          isOccuring = true;
        }
      });
    }
    this.isWhitelistMember = isOccuring;
    this.whitelistMember.emit(isOccuring);
  }

  private findUserInCompilations() {
    this.mongoService
      .findUserInCompilations()
      .then(result => {
        if (result.status === 'ok') {
          this.userOnWhitelistCollections = result.compilations;
        } else {
          throw new Error(result.message);
        }
      })
      .catch(e => console.error(e));
  }

  private getUserOwnedFinishedEntities() {
    if (this.userData && this.userData.data.entity) {
      (this.userData.data.entity.filter(entity => entity) as IEntity[]).forEach(
        entity => {
          if (entity.finished) {
            this.userOwnedFinishedEntities.push(entity);
          }
        },
      );
    }
  }

  public setcachedLoginData(password: string, username: string) {
    this.loginData = {
      username,
      password,
      isCached: true,
    };
  }
}
