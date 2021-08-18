import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  IAnnotation,
  ICompilation,
  IEntity,
  isAnnotation,
  isCompilation,
  isEntity,
  IStrippedUserData,
  IUserData,
} from 'src/common';

import { LoginComponent } from '../../components/dialogs/dialog-login/login.component';
import { BackendService } from '../backend/backend.service';

@Injectable({
  providedIn: 'root',
})
export class UserdataService {
  public loginRequired = false;
  public authenticatedUser = false;
  public loginData = {
    username: '',
    password: '',
    isCached: false,
  };
  public userData: IUserData | undefined = undefined;
  public guestUserData: IStrippedUserData | undefined;

  public userOwnsEntity = false;
  public userOwnsCompilation = false;
  public userWhitlistedEntity = false;
  public userWhitlistedCompilation = false;

  constructor(private backend: BackendService, private dialog: MatDialog) {}

  public userAuthentication(loginRequired: boolean): Promise<boolean> {
    this.loginRequired = loginRequired;

    return new Promise<boolean>((resolve, _) => {
      if (this.authenticatedUser && this.userData) resolve(true);
      this.backend
        .isAuthorized()
        .then(result => {
          this.setUserData(result);
          this.authenticatedUser = true;
          resolve(true);
        })
        .catch(e => {
          if (loginRequired) {
            this.attemptLogin().then(authorized => {
              resolve(authorized);
            });
          } else {
            // Server might not be reachable, skip login
            console.error(e);
            this.clearUserData();
            resolve(false);
          }
        });
    });
  }

  private async attemptLogin(): Promise<boolean> {
    return new Promise<boolean>((resolve, _) => {
      if (this.loginData.isCached) {
        this.backend
          .login(this.loginData.username, this.loginData.password)
          .then(result => {
            this.setUserData(result);
            this.authenticatedUser = true;
            resolve(true);
          })
          .catch(() => {
            this.openLoginDialog().then(loggedIn => {
              resolve(loggedIn);
            });

            /*console.error(err);
            this.clearUserData();
            reject(false);*/
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
    this.backend
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

  private setUserData(userData: IUserData) {
    if (this.guestUserData) this.guestUserData = undefined;
    this.userData = userData;
  }

  public checkOwnerState(element: ICompilation | IEntity | undefined): boolean {
    if (!element) {
      return false;
    }
    if (!this.userData?.data || (!isEntity(element) && !isCompilation(element))) {
      this.userOwnsEntity = false;
      this.userOwnsCompilation = false;
      return false;
    }
    const id = element._id;

    if (isCompilation(element)) {
      this.userOwnsCompilation = JSON.stringify(this.userData?.data?.compilation).includes(
        element._id.toString(),
      );
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
      this.userOwnsEntity = JSON.stringify(this.userData?.data?.entity).includes(
        element._id.toString(),
      );
      if (this.userOwnsEntity) {
        return this.userOwnsEntity;
      }
      if (this.userData.data.entity) {
        this.userOwnsEntity =
          this.userData.data.entity.find((_entity: IEntity) => _entity._id === id) !== undefined;
      } else {
        this.userOwnsEntity = false;
      }
      return this.userOwnsEntity;
    }
    return false;
  }

  public isUserWhitelisted(element: ICompilation | IEntity | undefined): boolean {
    if (!element) {
      return false;
    }
    if (!this.userData?.data) {
      this.userWhitlistedEntity = false;
      this.userWhitlistedCompilation = false;
      return false;
    }
    const id = this.userData._id;

    const persons = element.whitelist.groups
      // Flatten group members and owners
      .map(group => group.members.concat(...group.owners))
      .reduce((acc, val) => acc.concat(val), [] as IStrippedUserData[])
      // Combine with whitelisted persons
      .concat(...element.whitelist.persons);

    const whitelistContainsUser = persons.find(person => person._id === id) !== undefined;

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
    if (this.userData?.data?.annotation) {
      const result = this.userData.data.annotation.find(
        anno => isAnnotation(anno) && anno._id === annotation._id,
      );
      if (result) return true;
    }
    return annotation.creator._id === this.userData?._id ?? false;
  }

  public createTemporalUserData() {
    if (this.userData) return;
    this.guestUserData = {
      fullname: 'guest',
      username: 'guest',
      _id: this.backend.generateEntityId(),
    };
  }
}
