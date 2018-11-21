import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MongohandlerService {
  private endpoint = `${environment.express_server_url}:${environment.express_server_port}`;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {
  }

  // TODO: any durch Interface ersetzen
  public getCompilation(identifier: string): Observable<any[]> {
    return this.http.get<any>(`${this.endpoint}/api/v1/get/find/compilation/${identifier}`);
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
*/
}
