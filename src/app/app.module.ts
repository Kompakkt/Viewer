import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms'; // <-- NgModel lives here
import { HttpClientModule } from '@angular/common/http';
import { DeviceDetectorModule } from 'ngx-device-detector';
import { ColorChromeModule } from 'ngx-color/chrome';
import {SocketIoModule, SocketIoConfig} from 'ngx-socket-io';
import {environment} from '../environments/environment';
const socketConfig: SocketIoConfig = {
  url: `${environment.express_server_url}:${environment.express_server_port}`,
  options: {}
};

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {MenuComponent} from './components/menu/menu.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
  MatButtonModule,
  MatTooltipModule,
  MatIconModule,
  MatMenuModule,
  MatSnackBarModule,
  MatCardModule,
  MatTabsModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatCheckboxModule,
  MatInputModule,
  MatListModule, MatDividerModule, MatSliderModule, MatRadioModule, MatSelectModule, MatDialogModule, MatSlideToggleModule
} from '@angular/material';
import {EditorComponent} from './components/editor/editor.component';
import {AnnotationsEditorComponent} from './components/annotations-editor/annotations-editor.component';
import {AnnotationComponent} from './components/annotation/annotation.component';
import {AnnotationcardsComponent} from './components/annotationcards/annotationcards.component';
import {AnnotationwalkthroughComponent} from './components/annotationwalkthrough/annotationwalkthrough.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {ModelComponent} from './components/model/model.component';
import { CollectionsOverviewComponent } from './components/collections-overview/collections-overview.component';
import { LoadingscreenComponent } from './components/loadingscreen/loadingscreen.component';
import { MetadataComponent } from './components/metadata/metadata.component';
import { ModelsettingsComponent } from './components/modelsettings/modelsettings.component';
import { LoginComponent } from './components/dialogs/dialog-login/login.component';
import { PasswordComponent } from './components/password/password.component';
import { DialogDeleteAnnotationsComponent } from './components/dialogs/dialog-delete-annotations/dialog-delete-annotations.component';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    MenuComponent,
    EditorComponent,
    AnnotationsEditorComponent,
    AnnotationComponent,
    AnnotationcardsComponent,
    AnnotationwalkthroughComponent,
    ModelComponent,
    CollectionsOverviewComponent,
    LoadingscreenComponent,
    MetadataComponent,
    ModelsettingsComponent,
    LoginComponent,
    PasswordComponent,
    DialogDeleteAnnotationsComponent
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
    SocketIoModule.forRoot(socketConfig)
  ],
  entryComponents: [
    LoginComponent,
    PasswordComponent,
    DialogDeleteAnnotationsComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
