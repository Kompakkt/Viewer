import {TestBed, async} from '@angular/core/testing';
import {AppComponent} from './app.component';
import {LoadingscreenComponent} from './components/loadingscreen/loadingscreen.component';
import {SceneComponent} from './components/scene/scene.component';
import {ObjectFeaturesComponent} from './components/object-features/editor.component';
import {LoadComponent} from './components/content/collections-overview.component';
import {MenuComponent} from './components/menu/menu.component';
import {AnnotationwalkthroughComponent} from './components/object-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import {AnnotationcardsComponent} from './components/object-feature-annotations/annotationcards/annotationcards.component';
import {
  MatCardModule, MatCheckboxModule, MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatMenuModule,
  MatOptionModule,
  MatRadioModule,
  MatSelectModule, MatSliderModule, MatSlideToggleModule, MatSnackBarModule,
  MatTabsModule, MatTooltipModule, MatStepperModule, MatProgressSpinnerModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {AnnotationsEditorComponent} from './components/object-feature-annotations/annotations-editor/annotations-editor.component';
import {ObjectMetadataComponent} from './components/object-feature-metadata/metadata.component';
import {ObjectSettingsComponent} from './components/object-feature-settings/modelsettings.component';
import {ModelComponent} from './components/model/model.component';
import {AnnotationComponent} from './components/object-feature-annotations/annotation/annotation.component';
import {ColorChromeModule} from 'ngx-color/chrome';
import {HttpClientModule} from '@angular/common/http';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../environments/environment';
import {MediaComponent} from './components/media/media.component';

describe('AppComponent', () => {
  beforeEach(async(() => {

    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        LoadingscreenComponent,
        SceneComponent,
        ObjectFeaturesComponent,
        LoadComponent,
        MenuComponent,
        AnnotationwalkthroughComponent,
        AnnotationcardsComponent,
        AnnotationsEditorComponent,
        ObjectMetadataComponent,
        ObjectSettingsComponent,
        ModelComponent,
        AnnotationComponent,
        MediaComponent,
      ],
      imports: [
        FormsModule,
        MatIconModule,
        MatTabsModule,
        MatFormFieldModule,
        MatRadioModule,
        MatOptionModule,
        MatSelectModule,
        MatMenuModule,
        MatCardModule,
        MatCheckboxModule,
        MatTooltipModule,
        MatSliderModule,
        MatSlideToggleModule,
        ColorChromeModule,
        MatSnackBarModule,
        HttpClientModule,
        MatDialogModule,
        MatStepperModule,
        MatProgressSpinnerModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })
      ]
    }).compileComponents();
  }
  ));
  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });
});
