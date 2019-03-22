import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ModelsettingsComponent} from './modelsettings.component';
import {
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule, MatFormFieldModule, MatIconModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule, MatStepperModule
} from '@angular/material';
import {ColorChromeModule} from 'ngx-color/chrome';
import {HttpClientModule} from '@angular/common/http';
import {FormsModule} from '@angular/forms';

describe('ModelsettingsComponent', () => {
  let component: ModelsettingsComponent;
  let fixture: ComponentFixture<ModelsettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ModelsettingsComponent],
      imports: [
        MatCardModule,
        ColorChromeModule,
        MatSlideToggleModule,
        MatSliderModule,
        MatSnackBarModule,
        HttpClientModule,
        MatDialogModule,
        MatCheckboxModule,
        MatFormFieldModule,
        FormsModule,
        MatIconModule,
        MatStepperModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelsettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
