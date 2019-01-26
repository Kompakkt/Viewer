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
        MatCheckboxModule,
        MatIconModule,
        MatTooltipModule,
        MatSnackBarModule,
        HttpClientModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationsEditorComponent);
    component = fixture.componentInstance;

    // Mock annotation for @Input
    component.annotation = {
      _id: '2315',
      relatedModel: 'example',
      ranking: '1',
      referencePoint: [{
        dimension: '23',
        value: 15
      }],
      referencePointNormal: [{
        dimension: '23',
        value: 15
      }],
      cameraPosition: [{
        dimension: '23',
        value: 15
      }],
      preview: 15,
      originatorID: 'originator',
      validated: true,
      title: 'A Great Annotation!',
      description: 'A Wonderful Description',
      date: 'date',
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
