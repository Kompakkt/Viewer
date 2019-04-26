import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IModel, ICompilation, IAnnotation, ILDAPData, IServerResponse } from '../../interfaces/interfaces';

@Injectable({
  providedIn: 'root',
})
export class MongohandlerService {

  // Needed for ObjectId gen
  /* tslint:disable:no-magic-numbers */
  private genIndex = parseInt((Math.random() * 0xFFFFFF).toString(), 10);
  private MACHINE_ID = Math.floor(Math.random() * 0xFFFFFF);
  private pid = (typeof process === 'undefined' || typeof process.pid !== 'number'
    ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;
  /* tslint:enable:no-magic-numbers */
  //
  private endpoint = `${environment.express_server_url}:${environment.express_server_port}`;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
    withCredentials: true,
  };

  constructor(private http: HttpClient) {
  }

  // Helper
  private async updatePreviewURL(promise: Promise<any>) {
    const update = obj => {
      // Only update if it's a relative path and not a URL
      if (obj && obj.settings && obj.settings.preview
        && obj.settings.preview.indexOf('base64') === -1
        && obj.settings.preview.indexOf('http') === -1) {
        obj.settings.preview = `${this.endpoint}${obj.settings.preview}`;
      }
      return obj;
    };

    return new Promise<any>((resolve, reject) => {
      promise
        .then(result => {
          if (Array.isArray(result) && result[0] && !result[0].models) {
            result = result.map(update);
          } else if (Array.isArray(result) && result[0] && result[0].models) {
            for (const compilation of result) {
              for (let model of compilation.models) {
                model = update(model);
              }
            }
          } else if (result.models) {
            result.models = result.models.map(update);
          } else {
            result = update(result);
          }
          resolve(result);
        })
        .catch(reject);
    });
  }

  // Override GET and POST to use HttpOptions which is needed for auth
  private async get(path: string): Promise<any> {
    const getResult = this.http.get(`${this.endpoint}/${path}`, this.httpOptions);
    return this.updatePreviewURL(getResult.toPromise());
  }

  private post(path: string, obj: any): Observable<any> {
    return this.http.post(`${this.endpoint}/${path}`, obj, this.httpOptions);
  }

  // GETs
  public async getAllCompilations(): Promise<ICompilation[]> {
    return this.get(`api/v1/get/findall/compilation`);
  }

  public async getAllModels(): Promise<IModel[]> {
    return this.get(`api/v1/get/findall/model`);
  }

  public async getModel(identifier: string): Promise<IModel & IServerResponse> {
    return this.get(`api/v1/get/find/model/${identifier}`);
  }

  public async getCompilation(identifier: string, password?: string): Promise<ICompilation & IServerResponse> {
    return (password) ? this.get(`api/v1/get/find/compilation/${identifier}/${password}`)
      : this.get(`api/v1/get/find/compilation/${identifier}`);
  }

  public async getModelMetadata(identifier: string): Promise<any> {
    return this.get(`api/v1/get/find/digitalobject/${identifier}`);
  }

  public async getCurrentUserData(): Promise<ILDAPData & IServerResponse> {
    return this.get(`api/v1/get/ldata`);
  }

  public async getUnusedObjectId(): Promise<string> {
    return this.get(`api/v1/get/id`);
  }

  // POSTs
  public updateSettings(identifier: string, settings: any): Observable<any> {
    return this.post(`api/v1/post/settings/${identifier}`, settings);
  }

  public updateAnnotation(annotation: any): Observable<IAnnotation & IServerResponse> {
    return this.post(`api/v1/post/push/annotation`, annotation);
  }

  // Auth
  public login(username: string, password: string): Observable<ILDAPData & IServerResponse> {
    return this.post(`login`, { username, password });
  }

  public async logout(): Promise<any> {
    return this.get(`logout`);
  }

  public async isAuthorized(): Promise<any> {
    return this.get(`auth`);
  }

  // annotation
  public deleteRequest(
    identifier: string, type: string,
    username: string, password: string): Observable<any> {
    return this.post(`api/v1/post/remove/${type}/${identifier}`, { username, password });
  }

  // annotation
  public async shareAnnotation(identifierColl: string, annotationArray: string[]): Promise<any> {
    return this.post(`utility/moveannotations/${identifierColl}`, { annotationArray });
  }

  /**
   * Generates an ObjectId
   * This is used as fallback when we cannot get an ObjectId from Server
   */
  public generateObjectId(): string {
    /* tslint:disable:no-magic-numbers */
    const next = () => {
      return this.genIndex = (this.genIndex + 1) % 0xFFFFFF;
    };

    const hex = (length, n) => {
      n = n.toString(16);
      return (n.length === length) ? n : '00000000'.substring(n.length, length) + n;
    };

    const time = parseInt((Date.now() / 1000).toString(), 10) % 0xFFFFFFFF;

    return hex(8, time) + hex(6, this.MACHINE_ID) + hex(4, this.pid) + hex(6, next());
    /* tslint:enable:no-magic-numbers */
  }
}
