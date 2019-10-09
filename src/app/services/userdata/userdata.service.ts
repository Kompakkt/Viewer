import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { LoginComponent } from '../../components/dialogs/dialog-login/login.component';
import {
  IAnnotation,
  ICompilation,
  IEntity,
  ILDAPData,
  ILoginData,
  IUserData,
} from '../../interfaces/interfaces';
import { isCompilation, isEntity } from '../../typeguards/typeguards';
import { MongohandlerService } from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root',
})
export class UserdataService {
  public loginRequired = false;
  public authenticatedUser = false;
  public loginData: ILoginData = {
    username: '',
    password: '',
    isCached: false,
  };
  public userData: ILDAPData | undefined = undefined;
  public guestUserData: IUserData | undefined;

  public userOwnsEntity = false;
  public userOwnsCompilation = false;
  public userWhitlistedEntity = false;
  public userWhitlistedCompilation = false;

  constructor(
    private mongoService: MongohandlerService,
    private dialog: MatDialog,
  ) {}

  public userAuthentication(loginRequired: boolean): Promise<boolean> {
    this.loginRequired = loginRequired;

    return new Promise<boolean>((resolve, reject) => {
      if (this.authenticatedUser && this.userData) resolve(true);
      this.mongoService
        .isAuthorized()
        .then(result => {
          if (result.status === 'ok') {
            this.setUserData(result);
            this.authenticatedUser = true;
            resolve(true);
          } else {
            if (loginRequired) {
              this.attemptLogin().then(authorized => {
                resolve(authorized);
              });
            } else {
              this.clearUserData();
              resolve(false);
            }
          }
        })
        .catch(e => {
          // Server might not be reachable, skip login
          console.error(e);
          this.clearUserData();
          reject(false);
        });
    });
  }

  private async attemptLogin(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.loginData.isCached) {
        this.mongoService
          .login(this.loginData.username, this.loginData.password)
          .then(result => {
            if (result.status === 'ok') {
              this.setUserData(result);
              this.authenticatedUser = true;
              resolve(true);
            } else {
              this.openLoginDialog().then(loggedIn => {
                resolve(loggedIn);
              });
            }
          })
          .catch(err => {
            console.error(err);
            this.clearUserData();
            reject(false);
          });
      } else {
        this.openLoginDialog().then(loggedIn => {
          resolve(loggedIn);
        });
      }
    });
  }

  public openLoginDialog(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const dialogRef = this.dialog.open(LoginComponent);
      dialogRef.afterClosed().subscribe(result => {
        if (result !== false) {
          const data = result.data;
          this.setUserData(data.userData);
          this.authenticatedUser = true;
          this.loginData = {
            username: data.username,
            password: data.password,
            isCached: true,
          };
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  public logout() {
    this.mongoService
      .logout()
      .then(() => {})
      .catch(err => console.error(err));
    this.clearUserData();
  }

  private clearUserData() {
    this.authenticatedUser = false;
    this.loginData = {
      username: '',
      password: '',
      isCached: false,
    };
    this.userData = undefined;
    this.guestUserData = undefined;
    this.userOwnsEntity = false;
    this.userOwnsCompilation = false;
    this.userWhitlistedEntity = false;
    this.userWhitlistedCompilation = false;
  }

  private setUserData(userData: ILDAPData) {
    if (this.guestUserData) this.guestUserData = undefined;
    this.userData = userData;
  }

  public checkOwnerState(element: ICompilation | IEntity | undefined): boolean {
    if (!element) {
      return false;
    }
    if (
      !this.userData ||
      !this.userData.data ||
      (!isEntity(element) && !isCompilation(element))
    ) {
      this.userOwnsEntity = false;
      this.userOwnsCompilation = false;
      return false;
    }
    const id = element._id;

    if (isCompilation(element)) {
      const idFromUser = this.userData._id;
      this.userOwnsCompilation = element.relatedOwner
        ? element.relatedOwner._id === idFromUser
        : false;
      if (this.userOwnsCompilation) {
        return this.userOwnsCompilation;
      }
      if (this.userData.data.compilation) {
        this.userOwnsCompilation =
          this.userData.data.compilation.find(
            (_compilation: ICompilation) => _compilation._id === id,
          ) !== undefined;
      }
      return this.userOwnsCompilation;
    }

    if (isEntity(element)) {
      const idFromUser = this.userData._id;
      this.userOwnsEntity =
        element.relatedEntityOwners.find(owner => owner._id === idFromUser) !==
        undefined;
      if (this.userOwnsEntity) {
        return this.userOwnsEntity;
      }
      if (this.userData.data.entity) {
        this.userOwnsEntity =
          this.userData.data.entity.find(
            (_entity: IEntity) => _entity._id === id,
          ) !== undefined;
      } else {
        this.userOwnsEntity = false;
      }
      return this.userOwnsEntity;
    }
    return false;
  }

  public isUserWhitelisted(
    element: ICompilation | IEntity | undefined,
  ): boolean {
    if (!element) {
      return false;
    }
    if (!this.userData || !this.userData.data) {
      this.userWhitlistedEntity = false;
      this.userWhitlistedCompilation = false;
      return false;
    }
    const id = this.userData._id;

    const persons = element.whitelist.groups
      // Flatten group members and owners
      .map(group => group.members.concat(...group.owners))
      .reduce((acc, val) => acc.concat(val), [] as IUserData[])
      // Combine with whitelisted persons
      .concat(...element.whitelist.persons);

    const whitelistContainsUser =
      persons.find(person => person._id === id) !== undefined;

    if (isEntity(element)) {
      this.userWhitlistedEntity = whitelistContainsUser;
    }
    // tslint:disable-next-line:max-line-length
    if (isCompilation(element)) {
      this.userWhitlistedCompilation = whitelistContainsUser;
    }

    return whitelistContainsUser;
  }

  public isAnnotationOwner(annotation: IAnnotation): boolean {
    const idFromUser = this.userData
      ? this.userData._id
      : this.guestUserData
      ? this.guestUserData._id
      : 0;
    console.log(
      'Der Owner',
      idFromUser,
      'of',
      annotation,
      'ist',
      idFromUser === annotation.creator._id,
    );
    return idFromUser === annotation.creator._id;
  }

  public createTemporalUserData() {
    if (this.userData) return;
    this.guestUserData = {
      fullname: 'guest',
      username: 'guest',
      _id: this.mongoService.generateEntityId(),
    };
  }
}
