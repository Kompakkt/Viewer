import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {ImportService} from './services/import/import.service';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [ImportService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
