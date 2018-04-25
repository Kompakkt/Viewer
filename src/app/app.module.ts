import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {MenuComponent} from './menu/menu.component';
import {AnnotationsComponent} from './components/annotations/annotations.component';

import {ImportService} from './services/import/import.service';
import {CameraService} from './services/camera/camera.service';
import {BabylonService} from './services/engine/babylon.service';
import {SkyboxService} from './services/skybox/skybox.service';
import {LanguageService} from './services/language/language.service';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    MenuComponent,
    AnnotationsComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
    ImportService,
    SkyboxService,
    AnnotationsComponent,
    CameraService,
    BabylonService,
    LanguageService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
