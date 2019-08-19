import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from '../../../app/app.component';
import { LoadingscreenComponent } from '../../../app/components/loadingscreen/loadingscreen.component';
import { SceneComponent } from '../../../app/components/scene/scene.component';
import { MenuComponent } from '../../../app/components/menu/menu.component';
import { AnnotationwalkthroughComponent } from '../../../app/components/object-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import {
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatMenuModule,
  MatOptionModule,
  MatRadioModule,
  MatSelectModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatTabsModule,
  MatTooltipModule,
  MatStepperModule,
  MatProgressSpinnerModule,
  MatChipsModule,
} from '@angular/material';
import { FormsModule } from '@angular/forms';
import { AnnotationsEditorComponent } from '../../../app/components/object-feature-annotations/annotations-editor/annotations-editor.component';
import { AnnotationComponent } from '../../../app/components/object-feature-annotations/annotation/annotation.component';
import { ColorChromeModule } from 'ngx-color/chrome';
import { HttpClientModule } from '@angular/common/http';
import { SocketIoModule } from 'ngx-socket-io';
import { environment } from '../../../environments/environment';
import { BroadcastComponent } from '../../../app/components/broadcast/broadcast.component';
import { BroadcastingUsersComponent } from '../../../app/components/broadcast/broadcasting-users.component';
import { ObjectFeaturesComponent } from '../../../app/components/object-features/object-features.component';
import { ContentComponent } from '../../../app/components/content/content.component';
import { AnnotationComponentForEditorComponent } from '../../../app/components/object-feature-annotations/annotation/annotation-for-editor.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MarkdownModule } from 'ngx-markdown';
import { ObjectFeatureSettingsComponent } from '../../../app/components/object-feature-settings/object-feature-settings.component';
import { ObjectFeatureMetadataComponent } from '../../../app/components/object-feature-metadata/object-feature-metadata.component';
import { ContentBrowserComponent } from '../../../app/components/content-browser/content-browser.component';
import { MediaTypePipe } from '../../../app/pipes/media-type.pipe';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
import { RenderCanvasComponent } from '../../../app/components/render-canvas/render-canvas.component';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        LoadingscreenComponent,
        SceneComponent,
        MenuComponent,
        AnnotationwalkthroughComponent,
        AnnotationsEditorComponent,
        AnnotationComponent,
        BroadcastComponent,
        BroadcastingUsersComponent,
        ObjectFeaturesComponent,
        ContentComponent,
        AnnotationComponentForEditorComponent,
        ObjectFeatureSettingsComponent,
        ObjectFeatureMetadataComponent,
        ContentBrowserComponent,
        RenderCanvasComponent,
        MediaTypePipe,
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
        DragDropModule,
        MarkdownModule,
        MatChipsModule,
        SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {},
        }),
      ],
    }).overrideModule(BrowserDynamicTestingModule, {
      set: {
        entryComponents: [RenderCanvasComponent],
      },
    });
  }));
  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });
});
