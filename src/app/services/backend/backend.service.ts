import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  IAnnotation,
  ICompilation,
  ILDAPData,
  IMetaDataDigitalEntity,
  IEntity,
} from '../../interfaces/interfaces';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  // Needed for EntityId gen
  /* tslint:disable:no-magic-numbers */
  private genIndex = parseInt((Math.random() * 0xffffff).toString(), 10);
  private MACHINE_ID = Math.floor(Math.random() * 0xffffff);
  private pid =
    (typeof process === 'undefined' || typeof process.pid !== 'number'
      ? Math.floor(Math.random() * 100000)
      : process.pid) % 0xffff;
  /* tslint:enable:no-magic-numbers */
  //
  private endpoint = `${environment.express_server_url}:${environment.express_server_port}`;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
    withCredentials: true,
  };

  constructor(private http: HttpClient) {}

  // Override GET and POST to use HttpOptions which is needed for auth
  private async get(path: string): Promise<any> {
    return this.http
      .get(`${this.endpoint}/${path}`, this.httpOptions)
      .toPromise();
  }

  private post(path: string, obj: any): Promise<any> {
    return this.http
      .post(`${this.endpoint}/${path}`, obj, this.httpOptions)
      .toPromise();
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
  public async getCompilation(
    identifier: string,
    password?: string,
  ): Promise<ICompilation | null> {
    return password
      ? this.get(`api/v1/get/find/compilation/${identifier}/${password}`)
      : this.get(`api/v1/get/find/compilation/${identifier}`);
  }

  public async getEntityMetadata(
    identifier: string,
  ): Promise<IMetaDataDigitalEntity> {
    return this.get(`api/v1/get/find/digitalentity/${identifier}`);
  }

  public async getCurrentUserData(): Promise<ILDAPData> {
    return this.get(`api/v1/get/ldata`);
  }

  // POSTs
  public updateSettings(identifier: string, settings: any): Promise<any> {
    return this.post(`api/v1/post/settings/${identifier}`, settings);
  }

  public updateAnnotation(annotation: any): Promise<IAnnotation> {
    return this.post(`api/v1/post/push/annotation`, annotation);
  }

  // Auth
  public login(username: string, password: string): Promise<ILDAPData> {
    return this.post(`login`, { username, password });
  }

  public async logout(): Promise<string> {
    return this.get(`logout`);
  }

  public async isAuthorized(): Promise<ILDAPData> {
    return this.get(`auth`);
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

  public async shareAnnotation(
    identifierColl: string,
    annotationArray: string[],
  ): Promise<any> {
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

    const hex = (length, n) => {
      n = n.toString(16);
      return n.length === length
        ? n
        : '00000000'.substring(n.length, length) + n;
    };

    const time = parseInt((Date.now() / 1000).toString(), 10) % 0xffffffff;

    return (
      hex(8, time) + hex(6, this.MACHINE_ID) + hex(4, this.pid) + hex(6, next())
    );
    /* tslint:enable:no-magic-numbers */
  }
}
