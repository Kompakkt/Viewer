// tslint:disable:max-line-length
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here
import {
  MatButtonModule, MatCardModule, MatCheckboxModule, MatChipsModule,
  MatDialogModule, MatDividerModule, MatExpansionModule, MatFormFieldModule,
  MatIconModule, MatInputModule, MatListModule, MatMenuModule,
  MatProgressSpinnerModule, MatRadioModule, MatSelectModule, MatSliderModule,
  MatSlideToggleModule, MatSnackBarModule, MatStepperModule, MatTabsModule, MatTooltipModule,
} from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ColorChromeModule } from 'ngx-color/chrome';
import { DeviceDetectorModule } from 'ngx-device-detector';
import {MarkdownModule} from 'ngx-markdown';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';

import { environment } from '../environments/environment';

import { AppComponent } from './app.component';
import { BroadcastComponent } from './components/broadcast/broadcast.component';
import { BroadcastingUsersComponent } from './components/broadcast/broadcasting-users.component';
import { ContentBrowserComponent } from './components/content-browser/content-browser.component';
import { ContentComponent } from './components/content/content.component';
import {DialogAnnotationEditorComponent} from './components/dialogs/dialog-annotation-editor/dialog-annotation-editor.component';
import { DialogDeleteAnnotationsComponent } from './components/dialogs/dialog-delete-annotations/dialog-delete-annotations.component';
import { DialogDeleteSingleAnnotationComponent } from './components/dialogs/dialog-delete-single-annotation/dialog-delete-single-annotation.component';
import { DialogGetUserDataComponent } from './components/dialogs/dialog-get-user-data/dialog-get-user-data.component';
import { LoginComponent } from './components/dialogs/dialog-login/login.component';
import { DialogMeshsettingsComponent } from './components/dialogs/dialog-meshsettings/dialog-meshsettings.component';
import { DialogPasswordComponent } from './components/dialogs/dialog-password/dialog-password.component';
import { DialogShareAnnotationComponent } from './components/dialogs/dialog-share-annotation/dialog-share-annotation.component';
import { LoadingscreenComponent } from './components/loadingscreen/loadingscreen.component';
import {MediaBrowserComponent} from './components/media-browser/media-browser.component';
import { MenuComponent } from './components/menu/menu.component';
import { AnnotationComponentForEditorComponent } from './components/object-feature-annotations/annotation/annotation-for-editor.component';
import { AnnotationComponent } from './components/object-feature-annotations/annotation/annotation.component';
import { AnnotationsEditorComponent } from './components/object-feature-annotations/annotations-editor/annotations-editor.component';
import { AnnotationwalkthroughComponent } from './components/object-feature-annotations/annotationwalkthrough/annotationwalkthrough.component';
import { ObjectFeatureMetadataComponent } from './components/object-feature-metadata/object-feature-metadata.component';
import { ObjectFeatureSettingsComponent } from './components/object-feature-settings/object-feature-settings.component';
import { ObjectFeaturesComponent } from './components/object-features/object-features.component';
import { SceneComponent } from './components/scene/scene.component';
import {MediaTypePipe} from './pipes/media-type.pipe';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    MenuComponent,
    ObjectFeaturesComponent,
    AnnotationsEditorComponent,
    AnnotationComponent,
    AnnotationComponentForEditorComponent,
    AnnotationwalkthroughComponent,
    ContentComponent,
    ContentBrowserComponent,
    LoadingscreenComponent,
    ObjectFeatureMetadataComponent,
    ObjectFeatureSettingsComponent,
    LoginComponent,
    DialogPasswordComponent,
    DialogDeleteAnnotationsComponent,
    DialogMeshsettingsComponent,
    DialogAnnotationEditorComponent,
    MediaTypePipe,
    BroadcastComponent,
    BroadcastingUsersComponent,
    DialogDeleteSingleAnnotationComponent,
    DialogGetUserDataComponent,
    MediaBrowserComponent,
    DialogShareAnnotationComponent,
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
    DeviceDetectorModule.forRoot(),
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
    PerfectScrollbarModule,
  ],
  entryComponents: [
    LoginComponent,
    DialogPasswordComponent,
    DialogDeleteAnnotationsComponent,
    DialogMeshsettingsComponent,
    DialogAnnotationEditorComponent,
    DialogGetUserDataComponent,
    DialogShareAnnotationComponent,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {
}
