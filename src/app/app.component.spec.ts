import {TestBed, async} from '@angular/core/testing';
import {AppComponent} from './app.component';
import {LoadingscreenComponent} from './components/loadingscreen/loadingscreen.component';
import {SceneComponent} from './components/scene/scene.component';
import {EditorComponent} from './components/editor/editor.component';
import {CollectionsOverviewComponent} from './components/collections-overview/collections-overview.component';
import {MenuComponent} from './components/menu/menu.component';
import {AnnotationwalkthroughComponent} from './components/annotationwalkthrough/annotationwalkthrough.component';
import {AnnotationcardsComponent} from './components/annotationcards/annotationcards.component';
import {
  MatCardModule, MatCheckboxModule, MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatMenuModule,
  MatOptionModule,
  MatRadioModule,
  MatSelectModule, MatSliderModule, MatSlideToggleModule, MatSnackBarModule,
  MatTabsModule, MatTooltipModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {AnnotationsEditorComponent} from './components/annotations-editor/annotations-editor.component';
import {MetadataComponent} from './components/metadata/metadata.component';
import {ModelsettingsComponent} from './components/modelsettings/modelsettings.component';
import {ModelComponent} from './components/model/model.component';
import {AnnotationComponent} from './components/annotation/annotation.component';
import {ColorChromeModule} from 'ngx-color/chrome';
import {HttpClientModule} from '@angular/common/http';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        LoadingscreenComponent,
        SceneComponent,
        EditorComponent,
        CollectionsOverviewComponent,
        MenuComponent,
        AnnotationwalkthroughComponent,
        AnnotationcardsComponent,
        AnnotationsEditorComponent,
        MetadataComponent,
        ModelsettingsComponent,
        ModelComponent,
        AnnotationComponent
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
        MatDialogModule]
    }).compileComponents();
  }));
  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
