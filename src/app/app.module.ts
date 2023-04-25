// tslint:disable:max-line-length
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // <-- NgEntity lives here
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ColorChromeModule } from 'ngx-color/chrome';

import { AppComponent } from './app.component';
import { CompilationBrowserComponent } from './components/compilation-browser/compilation-browser.component';
import { CompilationBrowserEntityCardComponent } from './components/compilation-browser/entity-card/entity-card.component';
import { DialogAnnotationEditorComponent } from './components/dialogs/dialog-annotation-editor/dialog-annotation-editor.component';
import { DialogDeleteAnnotationsComponent } from './components/dialogs/dialog-delete-annotations/dialog-delete-annotations.component';
import { DialogDeleteSingleAnnotationComponent } from './components/dialogs/dialog-delete-single-annotation/dialog-delete-single-annotation.component';
import { DialogGetUserDataComponent } from './components/dialogs/dialog-get-user-data/dialog-get-user-data.component';
import { DialogInviteBroadcastingComponent } from './components/dialogs/dialog-invite-broadcasting/dialog-invite-broadcasting.component';
import { LoginComponent } from './components/dialogs/dialog-login/login.component';
import { DialogMeshsettingsComponent } from './components/dialogs/dialog-meshsettings/dialog-meshsettings.component';
import { DialogPasswordComponent } from './components/dialogs/dialog-password/dialog-password.component';
import { DialogShareAnnotationComponent } from './components/dialogs/dialog-share-annotation/dialog-share-annotation.component';
import { MediaBrowserComponent } from './components/entity-feature-annotations/annotation-media-browser/media-browser.component';
import { AnnotationComponentForEditorComponent } from './components/entity-feature-annotations/annotation/annotation-for-editor.component';
import { AnnotationComponent } from './components/entity-feature-annotations/annotation/annotation.component';
import { AnnotationsEditorComponent } from './components/entity-feature-annotations/annotations-editor/annotations-editor.component';
import { AnnotationwalkthroughComponent } from './components/entity-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import { EntityFeatureSettingsLightsComponent } from './components/entity-feature-settings/entity-feature-settings-lights/entity-feature-settings-lights.component';
import { EntityFeatureSettingsMeshComponent } from './components/entity-feature-settings/entity-feature-settings-mesh/entity-feature-settings-mesh.component';
import { EntityFeatureSettingsComponent } from './components/entity-feature-settings/entity-feature-settings.component';
import { LoadingscreenComponent } from './components/loadingscreen/loadingscreen.component';
import { MenuComponent } from './components/menu/menu.component';
import { RenderCanvasComponent } from './components/render-canvas/render-canvas.component';
import { SceneComponent } from './components/scene/scene.component';
import { SidenavMenuComponent } from './components/sidenav-menu/sidenav-menu.component';
import { SidenavComponent } from './components/sidenav/sidenav.component';
import { MediaTypePipe } from './pipes/media-type.pipe';
import { MarkdownPreviewComponent } from './components/markdown-preview/markdown-preview.component';
import { CameraSettingsComponent } from './components/menu/camera-settings/camera-settings.component';
import { BackgroundSettingsComponent } from './components/entity-feature-settings/background-settings/background-settings.component';
import { ColorToRgbaPipe } from './pipes/color-to-rgba.pipe';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    MenuComponent,
    AnnotationsEditorComponent,
    AnnotationComponent,
    AnnotationComponentForEditorComponent,
    AnnotationwalkthroughComponent,
    CompilationBrowserComponent,
    CompilationBrowserEntityCardComponent,
    LoadingscreenComponent,
    EntityFeatureSettingsComponent,
    LoginComponent,
    DialogPasswordComponent,
    DialogDeleteAnnotationsComponent,
    DialogMeshsettingsComponent,
    DialogAnnotationEditorComponent,
    MediaTypePipe,
    DialogDeleteSingleAnnotationComponent,
    DialogGetUserDataComponent,
    MediaBrowserComponent,
    DialogShareAnnotationComponent,
    DialogInviteBroadcastingComponent,
    RenderCanvasComponent,
    SidenavMenuComponent,
    SidenavComponent,
    EntityFeatureSettingsLightsComponent,
    EntityFeatureSettingsMeshComponent,
    MarkdownPreviewComponent,
    CameraSettingsComponent,
    BackgroundSettingsComponent,
    ColorToRgbaPipe,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatInputModule,
    MatListModule,
    MatDividerModule,
    HttpClientModule,
    DragDropModule,
    ColorChromeModule,
    MatSliderModule,
    MatRadioModule,
    MatSelectModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSidenavModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
