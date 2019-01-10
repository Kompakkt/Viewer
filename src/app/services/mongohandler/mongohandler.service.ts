import {Injectable} from '@angular/core';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MongohandlerService {

  private endpoint = `${environment.express_server_url}:${environment.express_server_port}`;
  private headers: HttpHeaders;

  constructor(private http: HttpClient) {

    this.headers = new HttpHeaders();
    this.headers.set('Content-Type', 'application/json');
  }

  public getAllCompilations(): Observable<any> {
    return this.http.get<any>(this.endpoint + '/api/v1/get/findall/compilation', {headers: this.headers});
  }

  public getAllModels(): Observable<any> {
    return this.http.get<any[]>(this.endpoint + '/api/v1/get/findall/model', {headers: this.headers});
    // return this.http.get<Model[]>(`${this.endpoint}/api/v1/get/findall/${Collection.Model}`).toPromise();
  }

  public getCompilation(identifier: string): Observable<any> {
    return this.http.get<any>(this.endpoint + '/api/v1/get/find/compilation/' + identifier, {headers: this.headers});
  }

  public getModelMetadata(identifier: string): Observable<any> {
    return this.http.get<any>(this.endpoint + '/api/v1/get/find/digitalobject/' + identifier, {headers: this.headers});
  }

  public updateScreenshot(identifier: string, screenshot: string): Observable<any> {
    return this.http.post<any>(this.endpoint + '/api/v1/post/screenshot/' + identifier, {data: screenshot});
  }

  public updateCameraPos(identifier: string, cameraPerspective: any): Observable<any> {
    console.log('Camera soll gespeichert werden');
    return this.http.post<any>(this.endpoint + '/api/v1/post/cameraPosition/' + identifier, {data: cameraPerspective});
  }

  /* Funktionen aus ObjectsRepository, nur zum Vergleich
    private findSingleInCollection(collection: Collection, identifier: string): Observable<Person | Institute | Tag> {
      return this.http.get<Person | Institute>(`${this.endpoint}/api/v1/get/find/${collection}/${identifier}`);
    }

    public findAllInCollection(collection: Collection): Observable<Person[] | Institute[] | Tag[]> {
      return this.http.get<Person[] | Institute[]>(`${this.endpoint}/api/v1/get/findall/${collection}`);
    }

    public submitToDB(SubmitObject: any): Observable<any> {
      return this.http.post(`${this.endpoint}/api/v1/post/submit`, SubmitObject);
    }

  public getCompilation(identifier: string): Promise<Compilation> {
    return this.http.get<Compilation>(`${this.endpoint}/api/v1/get/find/${Collection.Compilation}/${identifier}`).toPromise();
  }

    public getModelMetadata(identifier: string): Promise<any> {
    return this.http.get(`${this.endpoint}/api/v1/get/find/${Collection.DigitalObject}/${identifier}`).toPromise();
  }
  */
}
