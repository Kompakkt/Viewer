import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DialogAnnotationEditorComponent} from './dialog-annotation-editor.component';
import {MatFormFieldModule, MatIconModule} from '@angular/material';
import {MarkdownComponent} from 'ngx-markdown';

describe('DialogAnnotationEditorComponent', () => {
  let component: DialogAnnotationEditorComponent;
  let fixture: ComponentFixture<DialogAnnotationEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        DialogAnnotationEditorComponent,
        MarkdownComponent
      ],
      imports: [
        MatFormFieldModule,
        MatIconModule,
      ]
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
