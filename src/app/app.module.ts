import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms'; // <-- NgModel lives here


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
  MatCheckboxModule, MatInputModule, MatListModule, MatDividerModule
} from '@angular/material';
import {EditorComponent} from './components/editor/editor.component';
import {AnnotationsEditorComponent} from './components/annotations-editor/annotations-editor.component';
import { AnnotationComponent } from './components/annotation/annotation.component';
import { AnnotationcardsComponent } from './components/annotationcards/annotationcards.component';
import { AnnotationwalkthroughComponent } from './components/annotationwalkthrough/annotationwalkthrough.component';
import {DragDropModule} from '@angular/cdk/drag-drop';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    MenuComponent,
    EditorComponent,
    AnnotationsEditorComponent,
    AnnotationComponent,
    AnnotationcardsComponent,
    AnnotationwalkthroughComponent
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
    DragDropModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
