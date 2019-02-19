import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MongohandlerService {

  private endpoint = `${environment.express_server_url}:${environment.express_server_port}`;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    }),
    withCredentials: true
  };

  constructor(private http: HttpClient) {
  }

  // Helper
  private updatePreviewURL(promise: Promise<any>) {
    const update = (obj) => {
      if (obj && obj.settings && obj.settings.preview && obj.settings.preview.indexOf('base64') === -1) {
        obj.settings.preview = `${this.endpoint}${obj.settings.preview}`;
      }
      return obj;
    };

    return new Promise<any>((resolve, reject) => {
      promise.then(result => {
        if (Array.isArray(result) && result[0] && !result[0].models) {
          result = result.map(model => update(model));
        } else if (Array.isArray(result) && result[0] && result[0].models) {
          for (const compilation of result) {
            for (let model of compilation.models) {
              model = update(model);
            }
          }
        } else if (result.models) {
          result.models = result.models.map(model => update(model));
        } else {
          result = update(result);
        }
        resolve(result);
      }).catch(e => reject(e));
    });
  }

  // Override GET and POST to use HttpOptions which is needed for auth
  private get(path: string): Promise<any> {
    return this.updatePreviewURL(this.http.get(`${this.endpoint}/${path}`, this.httpOptions).toPromise());
  }

  private post(path: string, obj: any): Observable<any> {
    return this.http.post(`${this.endpoint}/${path}`, obj, this.httpOptions);
  }

  // GETs
  public getAllCompilations(): Promise<any> {
    return this.get(`api/v1/get/findall/compilation`);
  }

  public getAllModels(): Promise<any> {
    return this.get(`api/v1/get/findall/model`);
  }

  public getModel(identifier: string): Promise<any> {
    return this.get(`api/v1/get/find/model/${identifier}`);
  }

  public getCompilation(identifier: string, password?: string): Promise<any> {
    return (password) ? this.get(`api/v1/get/find/compilation/${identifier}/${password}`)
      : this.get(`api/v1/get/find/compilation/${identifier}`);
  }

  public getModelMetadata(identifier: string): Promise<any> {
    return this.get(`api/v1/get/find/digitalobject/${identifier}`);
  }

  public getCurrentUserData(): Promise<any> {
    return this.get(`api/v1/get/ldata`);
  }

  public async getUnusedObjectId(): Promise<string> {
    return this.get(`api/v1/get/id`);
  }

  // POSTs
  public updateSettings(identifier: string, settings: any): Observable<any> {
    return this.post(`api/v1/post/settings/${identifier}`, settings);
  }

  // Auth
  public login(username: string, password: string): Observable<any> {
    return this.post(`login`, { username: username, password: password });
  }

  public isAuthorized() {
    return this.get(`auth`);
  }

  /**
   * Generates an ObjectId
   * This is used as fallback when we cannot get an ObjectId from Server
   */
  public generateObjectId(): string {
    const MACHINE_ID = Math.floor(Math.random() * 0xFFFFFF);
    let index = parseInt((Math.random() * 0xFFFFFF).toString(), 10);
    const pid = (typeof process === 'undefined' || typeof process.pid !== 'number'
      ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;

    const next = () => {
      return index = (index + 1) % 0xFFFFFF;
    };

    const hex = (length, n) => {
      n = n.toString(16);
      return (n.length === length) ? n : '00000000'.substring(n.length, length) + n;
    };

    const time = parseInt((Date.now() / 1000).toString(), 10) % 0xFFFFFFFF;

    return hex(8, time) + hex(6, MACHINE_ID) + hex(4, pid) + hex(6, next());
  }
}
