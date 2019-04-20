import {TestBed} from '@angular/core/testing';

import {SocketService} from './socket.service';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';
import {MatDialogModule, MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('SocketService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SocketService],
      imports: [
        HttpClientModule,
        MatDialogModule,
        MatSnackBarModule,
        SocketIoModule.forRoot({
        url: `${environment.express_server_url}:${environment.express_server_port}`,
        options: {}
      }),]
    });
  });

  it('should be created', () => {
    const service: SocketService = TestBed.get(SocketService);
    expect(service).toBeTruthy();
  });
});
