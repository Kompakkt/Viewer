import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationsEditorComponent } from './annotations-editor.component';

describe('AnnotationsEditorComponent', () => {
  let component: AnnotationsEditorComponent;
  let fixture: ComponentFixture<AnnotationsEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AnnotationsEditorComponent ]
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
