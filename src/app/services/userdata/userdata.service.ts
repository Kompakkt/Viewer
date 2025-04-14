import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import {
  areDocumentsEqual,
  isDocument,
  IAnnotation,
  ICompilation,
  IDocument,
  IEntity,
  isAnnotation,
  isCompilation,
  isEntity,
  IStrippedUserData,
  IUserData,
} from 'src/common';
import {
  AuthConcern,
  AuthResult,
  LoginComponent,
} from '../../components/dialogs/dialog-login/login.component';
import { BackendService } from '../backend/backend.service';

const getWhitelistedPersons = (element: IEntity | ICompilation) => {
  return (
    element.whitelist.groups
      // Flatten group members and owners
      .map(group => group.members.concat(...group.owners))
      .reduce((acc, val) => acc.concat(val), [] as IStrippedUserData[])
      // Combine with whitelisted persons
      .concat(...element.whitelist.persons)
  );
};

const isUserOwned = (
  element: IEntity | ICompilation | null,
  userdata: IUserData | undefined,
  elementType: 'entity' | 'compilation',
) => {
  if (!element || !userdata) return false;
  const userElements = (userdata.data?.[elementType] ?? []).filter(isDocument);
  if (userElements.some(other => areDocumentsEqual(other, element))) return true;
  return element.creator?._id === userdata._id;
};

const isUserWhitelisted = (
  element: IEntity | ICompilation | null,
  userdata: IUserData | undefined,
) => {
  if (!element || !userdata) return false;
  const persons = getWhitelistedPersons(element);
  if (persons.some(person => person._id === userdata._id)) return true;
  return element.creator?._id === userdata._id;
};

export type LoginData = { username: string; password: string };

@Injectable({
  providedIn: 'root',
})
export class UserdataService {
  public loginRequired$ = new BehaviorSubject(false);
  public loginData$ = new BehaviorSubject<LoginData | undefined>(undefined);
  public userData$ = new BehaviorSubject<IUserData | undefined>(undefined);
  public isAuthenticated$ = this.userData$.pipe(map(userdata => !!userdata?._id));

  constructor(
    private backend: BackendService,
    private dialog: MatDialog,
  ) {}

  public doesUserOwn(element?: IEntity | ICompilation) {
    if (isEntity(element)) return isUserOwned(element, this.userData$.getValue(), 'entity');
    if (isCompilation(element))
      return isUserOwned(element, this.userData$.getValue(), 'compilation');
    return false;
  }

  public isUserWhitelistedFor(element?: IEntity | ICompilation) {
    if (isEntity(element)) return isUserWhitelisted(element, this.userData$.getValue());
    if (isCompilation(element)) return isUserWhitelisted(element, this.userData$.getValue());
    return false;
  }

  public async userAuthentication(loginRequired: boolean): Promise<boolean> {
    this.loginRequired$.next(loginRequired);
    const isAuthenticated = await firstValueFrom(this.isAuthenticated$);
    if (isAuthenticated) return true;

    return this.backend
      .isAuthorized()
      .then(result => {
        this.userData$.next(result);
        return true;
      })
      .catch(async e => {
        if (loginRequired) {
          return await this.attemptLogin();
        } else {
          // Server might not be reachable, skip login
          console.error(e);
          return false;
        }
      });
  }

  private async attemptLogin(): Promise<boolean> {
    const loginData = this.loginData$.getValue();

    if (loginData) {
      return this.backend
        .login(loginData.username, loginData.password)
        .then(result => {
          this.userData$.next(result);
          return true;
        })
        .catch(() => this.openLoginDialog());
    }

    return this.openLoginDialog();
  }

  public async openLoginDialog(): Promise<boolean> {
    const dialogRef = this.dialog.open<LoginComponent, AuthConcern, AuthResult>(LoginComponent, {
      width: '360px',
      data: 'login',
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return false;

    const { username, password, userData } = result;
    this.userData$.next(userData);
    this.loginData$.next({ username, password });
    return true;
  }

  public logout() {
    this.backend
      .logout()
      .then(() => {})
      .catch(err => console.error(err));
    this.userData$.next(undefined);
    this.loginData$.next(undefined);
  }

  public isAnnotationOwner(annotation: IAnnotation): boolean {
    const userData = this.userData$.getValue();
    const annotations = userData?.data?.annotation;

    if (annotation.creator._id === userData?._id) return true;
    return annotations?.some(other => isAnnotation(other) && other._id === annotation._id) ?? false;
  }
}
