import { Injectable } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {LoginComponent} from '../../components/dialogs/dialog-login/login.component';
import {
  IAnnotation,
  ICompilation,
  IEntity,
  ILDAPData, ILoginData, IUserData,
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

  public userOwnsEntity = false;
  public userOwnsCompilation = false;
  public userWhitlistedEntity = false;
  public userWhitlistedCompilation = false;

  constructor(private mongoService: MongohandlerService,
              private dialog: MatDialog) {
  }

  public userAuthentication(loginRequired: boolean): Promise<boolean> {
    this.loginRequired = loginRequired;

    return new Promise<boolean>((resolve, reject) => {
      if (this.authenticatedUser && this.userData) resolve(true);
      this.mongoService
          .isAuthorized()
          .then(result => {
            if (result.status === 'ok') {
              this.userData = result;
              this.authenticatedUser = true;
              resolve(true);
            } else {
              if (loginRequired) {
                this.attemptLogin()
                    .then(authorized => {
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
                this.userData = result;
                this.authenticatedUser = true;
                resolve(true);
              } else {
                this.openLoginDialog()
                    .then(loggedIn => {
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
        this.openLoginDialog()
            .then(loggedIn => {
              resolve(loggedIn);
            });
      }
    });
  }

  public openLoginDialog(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const dialogRef = this.dialog.open(
          LoginComponent,
      );
      dialogRef.afterClosed()
          .subscribe(result => {
            if (result !== false) {
              const data = result.data;
              this.userData = data.userData;
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
    this.userOwnsEntity = false;
    this.userOwnsCompilation = false;
    this.userWhitlistedEntity = false;
    this.userWhitlistedCompilation = false;
  }

  public checkOwnerState(element: ICompilation | IEntity | undefined): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
    if (!element) {
      reject(false);
      return;
    }
    if (!this.userData || !this.userData.data) {
      this.userOwnsEntity = false;
      this.userOwnsCompilation = false;
      resolve(false);
      return;
    }
    const id = element._id;

    if (isEntity(element) && this.userData.data.entity) {
      this.userOwnsEntity = !!this.userData.data.entity.find((el: IEntity) => el._id === id);
      if (this.userOwnsEntity) {
        resolve (true);
      } else {
        const idFromUser = this.userData._id;
        this.userOwnsEntity = !!element.relatedEntityOwners
            .find(owner => owner._id === idFromUser);
        resolve (!!element.relatedEntityOwners.find(owner => owner._id === idFromUser));
      }
    }
    if (isCompilation(element) && this.userData.data.compilation) {
      this.userOwnsCompilation = !!this.userData.data.compilation
          .find((el: ICompilation) => el._id === id);
      resolve(!!this.userData.data.compilation.find((el: ICompilation) => el._id === id));
    }
    });
  }

  public isUserWhitelisted(element: ICompilation | IEntity | undefined): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!element) {
        reject(false);
        return;
      }
      if (!this.userData || !this.userData.data) {
      this.userWhitlistedEntity = false;
      this.userWhitlistedCompilation = false;
      resolve(false);
      return;
    }
      const id = this.userData._id;

      const persons = element.whitelist.groups
      // Flatten group members and owners
      .map(group => group.members.concat(...group.owners))
      .reduce((acc, val) => acc.concat(val), [] as IUserData[])
      // Combine with whitelisted persons
      .concat(...element.whitelist.persons);

      if (isEntity(element)) {
        this.userWhitlistedEntity = !!persons.find(_p => _p._id === id);
        resolve(!!persons.find(_p => _p._id === id));
      }
    // tslint:disable-next-line:max-line-length
      if (isCompilation(element)) {
        this.userWhitlistedCompilation = !!persons.find(_p => _p._id === id);
        resolve(!!persons.find(_p => _p._id === id));
      }
    });
  }

  public isAnnotationOwner(annotation: IAnnotation): boolean {
    return this.userData ? this.userData._id === annotation.creator._id : false;
  }
}
