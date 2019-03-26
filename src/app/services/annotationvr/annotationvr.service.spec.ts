import {TestBed} from '@angular/core/testing';

import {AnnotationvrService} from './annotationvr.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';

describe('AnnotationvrService', () => {
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

  it('should be created', () => {
    const service: AnnotationvrService = TestBed.get(AnnotationvrService);
    expect(service).toBeTruthy();
  });
});
