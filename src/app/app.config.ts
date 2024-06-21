import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom } from '@angular/core';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ColorChromeModule } from 'ngx-color/chrome';
import { provideQuillConfig } from 'ngx-quill';
import { TranslatePipe } from './pipes/translate.pipe';
import { TranslateService } from './services/translate/translate.service';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
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
    ),
    TranslateService,
    TranslatePipe,
    {
      provide: APP_INITIALIZER,
      useFactory: (service: TranslateService) => () => service.requestLanguage(),
      deps: [TranslateService],
      multi: true,
    },
    provideRouter([]),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    provideQuillConfig({
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote'],
          ['link', 'image', 'video', 'formula'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
          [{ 'direction': 'rtl' }],                 
        ],
      }
    }),
  ],
};
