import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {EditorComponent} from './editor.component';
import {
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatStepperModule,
  MatTabsModule,
  MatTooltipModule
} from '@angular/material';
import {AnnotationsEditorComponent} from '../annotations-editor/annotations-editor.component';
import {ModelsettingsComponent} from '../modelsettings/modelsettings.component';
import {MetadataComponent} from '../metadata/metadata.component';
import {FormsModule} from '@angular/forms';
import {ColorChromeModule} from 'ngx-color/chrome';
import {HttpClientModule} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';
import {MediaBrowserComponent} from '../media-browser/media-browser.component';
import {MarkdownComponent} from 'ngx-markdown';

describe('EditorComponent', () => {
  let component: EditorComponent;
  let fixture: ComponentFixture<EditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        EditorComponent,
        AnnotationsEditorComponent,
        ModelsettingsComponent,
        MetadataComponent,
        MediaBrowserComponent,
        MarkdownComponent,
      ],
      imports: [
        MatIconModule,
        MatTabsModule,
        FormsModule,
        MatFormFieldModule,
        MatCardModule,
        MatCheckboxModule,
        MatTooltipModule,
        ColorChromeModule,
        MatSlideToggleModule,
        MatSliderModule,
        MatSnackBarModule,
        HttpClientModule,
        BrowserAnimationsModule,
        MatStepperModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        }),
        MatDialogModule
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
