import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {AnnotationsEditorComponent} from './annotations-editor.component';
import {MatCardModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatSnackBarModule, MatTooltipModule} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

describe('AnnotationsEditorComponent', () => {
  let component: AnnotationsEditorComponent;
  let fixture: ComponentFixture<AnnotationsEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AnnotationsEditorComponent],
      imports: [
        MatCardModule,
        FormsModule,
        MatFormFieldModule,
        MatCheckboxModule, MatIconModule, MatTooltipModule, MatSnackBarModule, HttpClientModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
