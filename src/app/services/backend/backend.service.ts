import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { IAnnotation, ICompilation, IDigitalEntity, IEntity, IUserData } from 'src/common';
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
  public async get(path: string): Promise<any> {
    return this.http.get(`${this.endpoint}${path}`, this.httpOptions).toPromise();
  }

  public post(path: string, obj: any): Promise<any> {
    return this.http.post(`${this.endpoint}${path}`, obj, this.httpOptions).toPromise();
  }

  // GETs
  public async getAllCompilations(): Promise<ICompilation[]> {
    return this.get(`api/v1/get/findall/compilation`);
  }

  public async getAllEntities(): Promise<IEntity[]> {
    return this.get(`api/v1/get/findall/entity`);
  }

  public async getEntity(identifier: string): Promise<IEntity> {
    return this.get(`api/v1/get/find/entity/${identifier}`);
  }

  /**
   * Fetch a resolved compilation by it's identifier
   * @param  {string}  identifier Database _id of the compilation
   * @param  {string}  password   (Optional) Password of the compilation
   * @param  {[type]}             [description]
   * @return {Promise}            Returns the compilation or null if it's password protected
   */
  public async getCompilation(identifier: string, password?: string): Promise<ICompilation | null> {
    return password
      ? this.get(`api/v1/get/find/compilation/${identifier}/${password}`)
      : this.get(`api/v1/get/find/compilation/${identifier}`);
  }

  public async getEntityMetadata(identifier: string): Promise<IDigitalEntity> {
    return this.get(`api/v1/get/find/digitalentity/${identifier}`);
  }

  // POSTs
  public updateSettings(identifier: string, settings: any): Promise<any> {
    return this.post(`api/v1/post/settings/${identifier}`, settings);
  }

  public updateAnnotation(annotation: any): Promise<IAnnotation> {
    return this.post(`api/v1/post/push/annotation`, annotation);
  }

  // Auth
  public login(username: string, password: string): Promise<IUserData> {
    return this.post(`user-management/login`, { username, password });
  }

  public async logout(): Promise<string> {
    return this.get(`user-management/logout`);
  }

  public async isAuthorized(): Promise<IUserData> {
    return this.get(`user-management/auth`);
  }

  public async findUserInCompilations(): Promise<ICompilation[]> {
    return this.get(`utility/finduserincompilations`);
  }

  // TODO: check return type
  public deleteRequest(
    identifier: string,
    type: string,
    username: string,
    password: string,
  ): Promise<any> {
    return this.post(`api/v1/post/remove/${type}/${identifier}`, {
      username,
      password,
    });
  }

  public async shareAnnotation(identifierColl: string, annotationArray: string[]): Promise<any> {
    return this.post(`utility/moveannotations/${identifierColl}`, {
      annotationArray,
    });
  }

  /**
   * Generates an EntityId
   * This is used as fallback when we cannot get an EntityId from Server
   */
  public generateEntityId(): string {
    /* tslint:disable:no-magic-numbers */
    const next = () => {
      return (this.genIndex = (this.genIndex + 1) % 0xffffff);
    };

    const hex = (length: number, n: string | number) => {
      n = n.toString(16);
      return n.length === length ? n : '00000000'.substring(n.length, length) + n;
    };

    const time = parseInt((Date.now() / 1000).toString(), 10) % 0xffffffff;

    return hex(8, time) + hex(6, this.MACHINE_ID) + hex(4, this.pid) + hex(6, next());
    /* tslint:enable:no-magic-numbers */
  }
}
