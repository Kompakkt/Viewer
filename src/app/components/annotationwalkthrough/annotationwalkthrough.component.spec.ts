import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {AnnotationwalkthroughComponent} from './annotationwalkthrough.component';
import {MatIconModule, MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';

describe('AnnotationwalkthroughComponent', () => {
  let component: AnnotationwalkthroughComponent;
  let fixture: ComponentFixture<AnnotationwalkthroughComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AnnotationwalkthroughComponent],
      imports: [
        MatIconModule,
        MatSnackBarModule,
        HttpClientModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationwalkthroughComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
