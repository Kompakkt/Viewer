import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAnnotationEditorComponent } from './dialog-annotation-editor.component';

describe('DialogAnnotationEditorComponent', () => {
  let component: DialogAnnotationEditorComponent;
  let fixture: ComponentFixture<DialogAnnotationEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogAnnotationEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogAnnotationEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
