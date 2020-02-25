import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from '../../src/app/app.component';
import { LoadingscreenComponent } from '../../src/app/components/loadingscreen/loadingscreen.component';
import { SceneComponent } from '../../src/app/components/scene/scene.component';
import { MenuComponent } from '../../src/app/components/menu/menu.component';
import { AnnotationwalkthroughComponent } from '../../src/app/components/entity-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { AnnotationsEditorComponent } from '../../src/app/components/entity-feature-annotations/annotations-editor/annotations-editor.component';
import { AnnotationComponent } from '../../src/app/components/entity-feature-annotations/annotation/annotation.component';
import { ColorChromeModule } from 'ngx-color/chrome';
import { HttpClientModule } from '@angular/common/http';
import { SocketIoModule } from 'ngx-socket-io';
import { environment } from '../../src/environments/environment';
import { AnnotationComponentForEditorComponent } from '../../src/app/components/entity-feature-annotations/annotation/annotation-for-editor.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MarkdownModule } from 'ngx-markdown';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidenavComponent } from '../../src/app/components/sidenav/sidenav.component';
import { SidenavMenuComponent } from '../../src/app/components/sidenav-menu/sidenav-menu.component';
import { CompilationBrowserComponent } from '../../src/app/components/compilation-browser/compilation-browser.component';
import { EntityFeatureSettingsComponent } from '../../src/app/components/entity-feature-settings/entity-feature-settings.component';
import { EntityFeatureSettingsLightsComponent } from '../../src/app/components/entity-feature-settings/entity-feature-settings-lights/entity-feature-settings-lights.component';
import { EntityFeatureSettingsMeshComponent } from '../../src/app/components/entity-feature-settings/entity-feature-settings-mesh/entity-feature-settings-mesh.component';
import { RenderCanvasComponent } from '../../src/app/components/render-canvas/render-canvas.component';

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
        AnnotationComponentForEditorComponent,
        SidenavComponent,
        SidenavMenuComponent,
        CompilationBrowserComponent,
        EntityFeatureSettingsComponent,
        EntityFeatureSettingsLightsComponent,
        EntityFeatureSettingsMeshComponent,
        RenderCanvasComponent,
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
        MatSidenavModule,
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
