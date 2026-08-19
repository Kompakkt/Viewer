import { computed, inject, Injectable, signal } from '@angular/core';
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
  IUserDataWithoutData,
  Collection,
} from '@kompakkt/common';
import {
  AuthConcern,
  AuthResult,
  LoginComponent,
} from '../../components/dialogs/dialog-login/login.component';
import { BackendService } from '../backend/backend.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

const isUserOwned = <T extends IEntity | ICompilation>(
  element: T,
  userdata: IUserData | IUserDataWithoutData,
  array: T[],
) => {
  if (array.some(other => areDocumentsEqual(other, element))) return true;
  return element.creator?._id === userdata._id;
};

const doesUserHaveAccess = (
  element: IEntity | ICompilation,
  userdata: IUserData | IUserDataWithoutData,
) => {
  const possibleAccessEntries = element.access.filter(e => {
    // TODO: Is account check necessary, or only profile check?
    if (e._id === userdata._id) return true;
    return userdata.profiles.some(
      p => p.profileId === e.profile.profileId && p.type === e.profile.type,
    );
  });
  return possibleAccessEntries.length > 0 || element.creator?._id === userdata._id;
};

export type LoginData = { username: string; password: string };

@Injectable({ providedIn: 'root' })
export class UserdataService {
  #backend = inject(BackendService);
  #dialog = inject(MatDialog);

  loginData = signal<LoginData | undefined>(undefined);
  userdata = signal<IUserDataWithoutData | undefined>(undefined);
  isAuthenticated = computed(() => !!this.userdata()?._id);

  #userdata$ = toObservable(this.userdata);
  updateTrigger$ = new BehaviorSubject<'all' | keyof typeof Collection>('all');

  #entities$: Observable<IEntity[]> = this.#userdata$.pipe(
    combineLatestWith(this.updateTrigger$),
    filter(([_, trigger]) => trigger === 'all' || trigger === Collection.entity),
    switchMap(([user]) => (user ? this.#backend.getUserDataEntities({}) : of([]))),
  );
  entities = toSignal(this.#entities$, { initialValue: [] });

  #compilations$: Observable<ICompilation[]> = this.#userdata$.pipe(
    combineLatestWith(this.updateTrigger$),
    filter(([_, trigger]) => trigger === 'all' || trigger === Collection.compilation),
    switchMap(([user]) => (user ? this.#backend.getUserDataCompilations({}) : of([]))),
  );
  compilations = toSignal(this.#compilations$, { initialValue: [] });

  #annotations$: Observable<IAnnotation[]> = this.#userdata$.pipe(
    combineLatestWith(this.updateTrigger$),
    filter(([_, trigger]) => trigger === 'all' || trigger === Collection.annotation),
    switchMap(([user]) => (user ? this.#backend.getUserDataAnnotations({}) : of([]))),
  );
  annotations = toSignal(this.#annotations$, { initialValue: [] });

  public doesUserOwn(element?: IEntity | ICompilation) {
    const userdata = this.userdata();
    if (!userdata) return false;
    if (isEntity(element)) {
      const entities = this.entities();
      return isUserOwned(element, userdata, entities);
    }
    if (isCompilation(element)) {
      const compilations = this.compilations();
      return isUserOwned(element, userdata, compilations);
    }
    return false;
  }

  public doesUserHaveAccess(element?: IEntity | ICompilation) {
    const userdata = this.userdata();
    if (!userdata) return false;
    if (isEntity(element)) return doesUserHaveAccess(element, userdata);
    if (isCompilation(element)) return doesUserHaveAccess(element, userdata);
    return false;
  }

  public async userAuthentication(loginRequired: boolean): Promise<boolean> {
    const isAuthenticated = this.isAuthenticated();
    if (isAuthenticated) return true;

    return this.#backend
      .isAuthorized()
      .then(result => {
        this.userdata.set(result);
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
    const loginData = this.loginData();

    if (loginData) {
      return this.#backend
        .login(loginData.username, loginData.password)
        .then(result => {
          this.userdata.set(result);
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
    this.userdata.set(userData);
    this.loginData.set({ username, password });
    return true;
  }

  public logout() {
    this.#backend
      .logout()
      .then(() => {})
      .catch(err => console.error(err));
    this.userdata.set(undefined);
    this.loginData.set(undefined);
  }

  public isAnnotationOwner(annotation: IAnnotation) {
    const userdata = this.userdata();
    if (!userdata) return false;
    const annotations = this.annotations();

    if (annotation.creator._id === userdata?._id) return true;
    return annotations?.some(other => isAnnotation(other) && other._id === annotation._id) ?? false;
  }
}
