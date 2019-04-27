import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ObjectFeatureMetadataComponent} from './object-feature-metadata.component';
import {HttpClientModule} from '@angular/common/http';
import {MatCardModule, MatIconModule, MatSnackBarModule, MatStepperModule} from '@angular/material';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';

describe('MetadataComponent', () => {
  let component: ObjectFeatureMetadataComponent;
  let fixture: ComponentFixture<ObjectFeatureMetadataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObjectFeatureMetadataComponent],
      imports: [
        HttpClientModule,
        MatSnackBarModule,
        MatIconModule,
        MatCardModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObjectFeatureMetadataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
