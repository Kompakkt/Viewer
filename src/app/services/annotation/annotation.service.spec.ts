import {TestBed, inject} from '@angular/core/testing';

import {AnnotationService} from './annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';

describe('AnnotationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [
        MatSnackBarModule,
        HttpClientModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })]
    });
  });

  it('should be created', inject([AnnotationService], (service: AnnotationService) => {
    expect(service).toBeTruthy();
  }));
});
