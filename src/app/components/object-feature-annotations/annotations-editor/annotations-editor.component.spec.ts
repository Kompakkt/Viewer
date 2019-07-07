import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {AnnotationsEditorComponent} from './annotations-editor.component';
import {
  MatCardModule,
  MatCheckboxModule, MatDialogModule,
  MatFormFieldModule,
  MatIconModule, MatInputModule,
  MatSnackBarModule,
  MatTooltipModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../../environments/environment';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MediaBrowserComponent} from '../../media-browser/media-browser.component';
import {MarkdownComponent} from 'ngx-markdown';

describe('AnnotationsEditorComponent', () => {
  let component: AnnotationsEditorComponent;
  let fixture: ComponentFixture<AnnotationsEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AnnotationsEditorComponent,
        MediaBrowserComponent,
        MarkdownComponent,
      ],
      imports: [
        MatCardModule,
        FormsModule,
        MatFormFieldModule,
        MatCheckboxModule,
        MatIconModule,
        MatTooltipModule,
        MatSnackBarModule,
        HttpClientModule,
        MatDialogModule,
        MatInputModule,
        BrowserAnimationsModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationsEditorComponent);
    component = fixture.componentInstance;

    // Mock annotation for @Input

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
