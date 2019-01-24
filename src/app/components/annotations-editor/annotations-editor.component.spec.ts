import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {AnnotationsEditorComponent} from './annotations-editor.component';
import {MatCardModule} from '@angular/material';

describe('AnnotationsEditorComponent', () => {
  let component: AnnotationsEditorComponent;
  let fixture: ComponentFixture<AnnotationsEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AnnotationsEditorComponent],
      imports: [MatCardModule]
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
