// tslint:disable:max-line-length
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- NgEntity lives here
import {
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatDividerModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatStepperModule,
  MatTabsModule,
  MatTooltipModule,
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ColorChromeModule } from 'ngx-color/chrome';
import { MarkdownModule } from 'ngx-markdown';
import { SocketIoModule } from 'ngx-socket-io';

import { environment } from '../environments/environment';

import { AppComponent } from './app.component';
import { CompilationBrowserComponent } from './components/compilation-browser/compilation-browser.component';
import { DialogAnnotationEditorComponent } from './components/dialogs/dialog-annotation-editor/dialog-annotation-editor.component';
import { DialogDeleteAnnotationsComponent } from './components/dialogs/dialog-delete-annotations/dialog-delete-annotations.component';
import { DialogDeleteSingleAnnotationComponent } from './components/dialogs/dialog-delete-single-annotation/dialog-delete-single-annotation.component';
import { DialogGetUserDataComponent } from './components/dialogs/dialog-get-user-data/dialog-get-user-data.component';
import { DialogInviteBroadcastingComponent } from './components/dialogs/dialog-invite-broadcasting/dialog-invite-broadcasting.component';
import { LoginComponent } from './components/dialogs/dialog-login/login.component';
import { DialogMeshsettingsComponent } from './components/dialogs/dialog-meshsettings/dialog-meshsettings.component';
import { DialogPasswordComponent } from './components/dialogs/dialog-password/dialog-password.component';
import { DialogShareAnnotationComponent } from './components/dialogs/dialog-share-annotation/dialog-share-annotation.component';
import { EntityFeatureSettingsComponent } from './components/entity-feature-settings/entity-feature-settings.component';
import { LoadingscreenComponent } from './components/loadingscreen/loadingscreen.component';
import { MenuComponent } from './components/menu/menu.component';
import { MediaBrowserComponent } from './components/object-feature-annotations/annotation-media-browser/media-browser.component';
import { AnnotationComponentForEditorComponent } from './components/object-feature-annotations/annotation/annotation-for-editor.component';
import { AnnotationComponent } from './components/object-feature-annotations/annotation/annotation.component';
import { AnnotationsEditorComponent } from './components/object-feature-annotations/annotations-editor/annotations-editor.component';
import { AnnotationwalkthroughComponent } from './components/object-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import { RenderCanvasComponent } from './components/render-canvas/render-canvas.component';
import { SceneComponent } from './components/scene/scene.component';
import { SidenavMenuComponent } from './components/sidenav-menu/sidenav-menu.component';
import { SidenavComponent } from './components/sidenav/sidenav.component';
import { MediaTypePipe } from './pipes/media-type.pipe';

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
    SocketIoModule.forRoot({
      url: `${environment.express_server_url}:${environment.express_server_port}`,
    }),
    MarkdownModule.forRoot(),
    MatSidenavModule,
  ],
  entryComponents: [
    LoginComponent,
    DialogPasswordComponent,
    DialogDeleteAnnotationsComponent,
    DialogMeshsettingsComponent,
    DialogAnnotationEditorComponent,
    DialogGetUserDataComponent,
    DialogShareAnnotationComponent,
    DialogInviteBroadcastingComponent,
    RenderCanvasComponent,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
