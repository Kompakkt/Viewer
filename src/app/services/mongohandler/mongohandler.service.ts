import {Injectable} from '@angular/core';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';

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

  // Override GET and POST to use HttpOptions which is needed for auth
  private get(path: string): Observable<any> {
    return this.http.get(`${this.endpoint}/${path}`, this.httpOptions);
  }

  private post(path: string, obj: any): Observable<any> {
    return this.http.post(`${this.endpoint}/${path}`, obj, this.httpOptions);
  }


  // GETs
  public getAllCompilations(): Observable<any> {
    return this.get(`api/v1/get/findall/compilation`);
  }

  public getAllModels(): Observable<any> {
    return this.get(`api/v1/get/findall/model`);
  }

  public getModel(identifier: string): Observable<any> {
    return this.get(`api/v1/get/find/model/${identifier}`);
  }
  public getCompilation(identifier: string): Observable<any> {
    return this.get(`api/v1/get/find/compilation//${identifier}`);
  }

  public getModelMetadata(identifier: string): Observable<any> {
    return this.get(`api/v1/get/find/digitalobject/${identifier}`);
  }

  // POSTs
  public updateScreenshot(identifier: string, screenshot: string): Observable<any> {
    return this.post(`api/v1/post/screenshot/${identifier}`, {data: screenshot});
  }

  public updateCameraPos(identifier: string, cameraPerspective: any): Observable<any> {
    console.log('Camera soll gespeichert werden');
    return this.post(`api/v1/post/cameraPosition/${identifier}`, {data: cameraPerspective});
  }

  // Auth
  public login(username: string, password: string): Observable<any> {
    return this.post(`login`, {username: username, password: password});
  }

  public isAuthorized() {
    return this.get(`auth`);
  }

}
