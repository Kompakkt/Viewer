import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  BehaviorSubject,
  combineLatestWith,
  filter,
  firstValueFrom,
  map,
  Observable,
  share,
  switchMap,
  tap,
} from 'rxjs';
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
  Collection,
} from 'src/common';
import {
  AuthConcern,
  AuthResult,
  LoginComponent,
} from '../../components/dialogs/dialog-login/login.component';
import { BackendService } from '../backend/backend.service';
import { IUserDataWithoutData } from 'src/common/interfaces';

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

const isUserOwned = <T extends IEntity | ICompilation>(
  element: T,
  userdata: IUserData | IUserDataWithoutData,
  array: T[],
) => {
  if (array.some(other => areDocumentsEqual(other, element))) return true;
  return element.creator?._id === userdata._id;
};

const isUserWhitelisted = (
  element: IEntity | ICompilation,
  userdata: IUserData | IUserDataWithoutData,
) => {
  const persons = getWhitelistedPersons(element);
  // This is according to the behaviour of the annotation access dialog in the repo
  // No persons with enabled whitelist = open access
  if (persons.length === 0) return true;
  if (persons.some(person => person._id === userdata._id)) return true;
  return element.creator?._id === userdata._id;
};

export type LoginData = { username: string; password: string };

@Injectable({ providedIn: 'root' })
export class UserdataService {
  #backend = inject(BackendService);
  #dialog = inject(MatDialog);

  loginRequired$ = new BehaviorSubject(false);
  loginData$ = new BehaviorSubject<LoginData | undefined>(undefined);
  userData$ = new BehaviorSubject<IUserDataWithoutData | undefined>(undefined);
  isAuthenticated$ = this.userData$.pipe(map(userdata => !!userdata?._id));

  updateTrigger$ = new BehaviorSubject<
    'all' | Collection.entity | Collection.compilation | Collection.annotation
  >('all');

  user$ = this.userData$.pipe(filter(user => !!user));

  entities$: Observable<IEntity[]> = this.user$.pipe(
    combineLatestWith(this.updateTrigger$),
    filter(([_, trigger]) => trigger === 'all' || trigger === Collection.entity),
    switchMap(() => this.#backend.getUserDataCollection(Collection.entity)),
    share(),
  );

  compilations$: Observable<ICompilation[]> = this.user$.pipe(
    combineLatestWith(this.updateTrigger$),
    filter(([_, trigger]) => trigger === 'all' || trigger === Collection.compilation),
    switchMap(() => this.#backend.getUserDataCollection(Collection.compilation)),
    share(),
  );

  annotations$: Observable<IAnnotation[]> = this.user$.pipe(
    combineLatestWith(this.updateTrigger$),
    filter(([_, trigger]) => trigger === 'all' || trigger === Collection.annotation),
    switchMap(() => this.#backend.getUserDataCollection(Collection.annotation)),
    share(),
  );

  public async doesUserOwn(element?: IEntity | ICompilation) {
    const userdata = await firstValueFrom(this.userData$);
    if (!userdata) return false;
    if (isEntity(element)) {
      const entities = await firstValueFrom(this.entities$);
      return isUserOwned(element, userdata, entities);
    }
    if (isCompilation(element)) {
      const compilations = await firstValueFrom(this.compilations$);
      return isUserOwned(element, userdata, compilations);
    }
    return false;
  }

  public async isUserWhitelistedFor(element?: IEntity | ICompilation) {
    const userdata = await firstValueFrom(this.userData$);
    if (!userdata) return false;
    if (isEntity(element)) return isUserWhitelisted(element, userdata);
    if (isCompilation(element)) return isUserWhitelisted(element, userdata);
    return false;
  }

  public async userAuthentication(loginRequired: boolean): Promise<boolean> {
    this.loginRequired$.next(loginRequired);
    const isAuthenticated = await firstValueFrom(this.isAuthenticated$);
    if (isAuthenticated) return true;

    return this.#backend
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
      return this.#backend
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
    const dialogRef = this.#dialog.open<LoginComponent, AuthConcern, AuthResult>(LoginComponent, {
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
    this.#backend
      .logout()
      .then(() => {})
      .catch(err => console.error(err));
    this.userData$.next(undefined);
    this.loginData$.next(undefined);
  }

  public async isAnnotationOwner(annotation: IAnnotation) {
    const userdata = await firstValueFrom(this.userData$);
    if (!userdata) return false;
    const annotations = await firstValueFrom(this.annotations$);

    if (annotation.creator._id === userdata?._id) return true;
    return annotations?.some(other => isAnnotation(other) && other._id === annotation._id) ?? false;
  }
}
