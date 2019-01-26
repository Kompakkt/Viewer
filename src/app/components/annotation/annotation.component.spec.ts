import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {AnnotationComponent} from './annotation.component';
import {
  MatCardModule,
  MatFormFieldModule,
  MatIconModule, MatSnackBarModule,
  MatTooltipModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

describe('AnnotationComponent', () => {
  let component: AnnotationComponent;
  let fixture: ComponentFixture<AnnotationComponent>;

  beforeEach(async(() => {

    TestBed.configureTestingModule({
      declarations: [AnnotationComponent],
      imports: [
        MatFormFieldModule,
        MatCardModule,
        MatIconModule,
        MatSnackBarModule,
        MatTooltipModule,
        FormsModule,
        HttpClientModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationComponent);
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

    fixture.detectChanges();
    expect(component).toBeTruthy();

    expect(component).toBeTruthy();
  });
});
