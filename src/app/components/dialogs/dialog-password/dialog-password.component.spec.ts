import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DialogPasswordComponent} from './dialog-password.component';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatSliderModule,
  MatSnackBarModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

describe('DialogPasswordComponent', () => {
  let component: DialogPasswordComponent;
  let fixture: ComponentFixture<DialogPasswordComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DialogPasswordComponent],
      imports: [
        MatFormFieldModule,
        FormsModule,
        MatDialogModule,
        HttpClientModule,
        MatSnackBarModule,
        MatSliderModule,
        MatInputModule,
        BrowserAnimationsModule
      ],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: {}},
        {provide: MatDialogRef, useValue: {}}
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
