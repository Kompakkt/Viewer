import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import {
  Collection,
  IAnnotation,
  ICompilation,
  IDigitalEntity,
  IEntity,
  isAnnotation,
  isCompilation,
  isEntity,
  isResolvedCompilation,
  IUserDataWithoutData,
  UserDataCollectionDocumentType,
} from '@kompakkt/common';
import {
  paths,
  PathParams,
  Endpoint,
  Response,
  QueryParams,
  RequestBody,
} from '@kompakkt/server-openapi';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environment';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  // Needed for EntityId gen
  /* tslint:disable:no-magic-numbers */
  private genIndex = parseInt((Math.random() * 0xffffff).toString(), 10);
  private MACHINE_ID = Math.floor(Math.random() * 0xffffff);
  private pid = Math.floor(Math.random() * 100000) % 0xffff;
  /* tslint:enable:no-magic-numbers */
  //
  private endpoint = environment.server_url;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
    withCredentials: true,
  };

  constructor(private http: HttpClient) {}

  // Override GET and POST to use HttpOptions which is needed for auth
  public async get<T extends unknown>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.endpoint}${path}`, this.httpOptions));
  }

  public post<T extends unknown>(path: string, obj: any): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.endpoint}${path}`, obj, this.httpOptions));
  }

  // Helper methods for type-safe API calls based on the OpenAPI spec provided by the backend.

  private constructPathWithParams(
    path: string,
    {
      pathParams,
      queryParams,
    }: {
      pathParams?: Record<string, string | boolean | number>;
      queryParams?: Record<string, string | boolean | number>;
    },
  ) {
    let compiledPath = path;
    if (pathParams) {
      for (const [key, value] of Object.entries(pathParams)) {
        compiledPath = compiledPath.replace(`{${key}}`, value.toString());
      }
    }
    if (queryParams) {
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value.toString())}`)
        .join('&');
      if (queryString.length > 0) {
        compiledPath += `?${queryString}`;
      }
    }
    return compiledPath;
  }

  public createGetPromise<Path extends keyof paths>(
    path: Path,
    {
      pathParams,
      queryParams,
      options,
    }: {
      pathParams: PathParams<Endpoint<'get', Path>>;
      queryParams: QueryParams<Endpoint<'get', Path>>;
      options?: Parameters<HttpClient['get']>[1];
    },
  ) {
    const compiledPath = this.constructPathWithParams(path as string, { pathParams, queryParams });
    return this.http.get<Response<Endpoint<'get', Path>>>(compiledPath, options);
  }

  public createGet<Path extends keyof paths>(
    path: Path,
    {
      pathParams,
      queryParams,
      options,
    }: {
      pathParams: PathParams<Endpoint<'get', Path>>;
      queryParams: QueryParams<Endpoint<'get', Path>>;
      options?: Parameters<HttpClient['get']>[1];
    },
  ) {
    return firstValueFrom(this.createGetPromise(path, { pathParams, queryParams, options }));
  }

  public createPostPromise<Path extends keyof paths>(
    path: Path,
    {
      body,
      pathParams,
      queryParams,
      options,
    }: {
      body: RequestBody<Endpoint<'post', Path>>;
      pathParams: PathParams<Endpoint<'post', Path>>;
      queryParams: QueryParams<Endpoint<'post', Path>>;
      options?: Parameters<HttpClient['post']>[2];
    },
  ) {
    const compiledPath = this.constructPathWithParams(path as string, { pathParams, queryParams });
    return this.http.post<Response<Endpoint<'post', Path>>>(compiledPath, body, options);
  }

  public createPost<Path extends keyof paths>(
    path: Path,
    {
      body,
      pathParams,
      queryParams,
      options,
    }: {
      body: RequestBody<Endpoint<'post', Path>>;
      pathParams: PathParams<Endpoint<'post', Path>>;
      queryParams: QueryParams<Endpoint<'post', Path>>;
      options?: Parameters<HttpClient['post']>[2];
    },
  ) {
    return firstValueFrom(this.createPostPromise(path, { body, pathParams, queryParams, options }));
  }

  // GETs
  public async getEntity(identifier: string) {
    return this.createGet('/server/api/v1/get/find/{collection}/{identifier}', {
      pathParams: { collection: Collection.entity, identifier },
      queryParams: {},
    }).then(response => (isEntity(response) ? response : undefined));
  }

  public async getCompilation(identifier: string) {
    return this.createGet('/server/api/v1/get/find/{collection}/{identifier}', {
      pathParams: { collection: Collection.compilation, identifier },
      queryParams: {},
    }).then(response => (isCompilation(response) ? response : undefined));
  }

  // POSTs
  public async updateSettings(
    identifier: string,
    settings: RequestBody<Endpoint<'post', '/server/api/v1/post/settings/{identifier}'>>,
  ) {
    return this.createPost('/server/api/v1/post/settings/{identifier}', {
      pathParams: { identifier },
      queryParams: {},
      body: settings,
    });
  }

  public async updateAnnotation(
    annotation: RequestBody<Endpoint<'post', '/server/api/v1/post/push/{collection}'>>,
  ) {
    return this.createPost('/server/api/v1/post/push/{collection}', {
      pathParams: { collection: Collection.annotation },
      queryParams: {},
      body: annotation,
    }).then(response => isAnnotation(response));
  }

  public generateVideoPreview(identifier: string, screenshots: string[]) {
    return this.createPost('/server/utility/generate-entity-video-preview', {
      pathParams: {},
      queryParams: {},
      body: {
        entityId: identifier,
        screenshots,
      },
    });
  }

  // Auth
  public login(username: string, password: string) {
    return this.createPost('/server/user-management/login', {
      pathParams: { strategy: 'local' },
      queryParams: {},
      body: { username, password },
    });
  }

  public async logout() {
    return this.createGet('/server/user-management/logout', {
      pathParams: {},
      queryParams: {},
    });
  }

  public async isAuthorized() {
    return this.createGet('/server/user-management/auth', {
      pathParams: {},
      queryParams: {},
    });
  }

  public deleteRequest(
    identifier: string,
    collection: keyof typeof Collection,
    username: string,
    password: string,
  ) {
    return this.createPost('/server/api/v1/post/remove/{collection}/{identifier}', {
      pathParams: { collection, identifier },
      queryParams: {},
      body: { username, password },
    });
  }

  // API V2
  public async getUserDataEntities(options: {
    depth?: number;
    full?: boolean;
    profileId?: string;
  }) {
    return this.createGet('/server/api/v2/user-data/get-collection/entity', {
      pathParams: {},
      queryParams: options,
    });
  }

  public async getUserDataCompilations(options: {
    depth?: number;
    full?: boolean;
    profileId?: string;
  }) {
    return this.createGet('/server/api/v2/user-data/get-collection/compilation', {
      pathParams: {},
      queryParams: options,
    });
  }

  public async getUserDataAnnotations(options: {
    depth?: number;
    full?: boolean;
    profileId?: string;
  }) {
    return this.createGet('/server/api/v2/user-data/get-collection/annotation', {
      pathParams: {},
      queryParams: options,
    });
  }
}
