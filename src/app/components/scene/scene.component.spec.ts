import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {SceneComponent} from './scene.component';
import {
  MatCardModule,
  MatDialogActions,
  MatDialogContent,
  MatFormFieldModule,
  MatIconModule,
  MatSnackBarModule,
  MatTooltipModule
} from '@angular/material';
import {AnnotationwalkthroughComponent} from '../annotations/annotationwalkthrough/annotationwalkthrough.component';
import {AnnotationcardsComponent} from '../annotations/annotationcards/annotationcards.component';
import {AnnotationComponent} from '../annotations/annotation/annotation.component';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';
import {MediaComponent} from '../media/media.component';
import {MediaBrowserComponent} from '../media-browser/media-browser.component';
import {MarkdownComponent} from 'ngx-markdown';

describe('SceneComponent', () => {
  let component: SceneComponent;
  let fixture: ComponentFixture<SceneComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        SceneComponent,
        AnnotationComponent,
        AnnotationwalkthroughComponent,
        AnnotationcardsComponent,
        MatDialogContent,
        MatDialogActions,
        MediaComponent,
        MediaBrowserComponent,
        MarkdownComponent,
      ],
      imports: [
        MatCardModule,
        MatTooltipModule,
        FormsModule,
        MatFormFieldModule,
        MatIconModule,
        MatSnackBarModule,
        HttpClientModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SceneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
