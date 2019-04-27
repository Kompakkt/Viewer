import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ObjectFeatureSettingsComponent} from './object-feature-settings.component';
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
  let component: ObjectFeatureSettingsComponent;
  let fixture: ComponentFixture<ObjectFeatureSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObjectFeatureSettingsComponent],
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
    fixture = TestBed.createComponent(ObjectFeatureSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
