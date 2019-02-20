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
import {Annotation} from '../../interfaces/annotation2/annotation2';

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
    // ToDo: Add example annotation
    // component.annotation = new class implements Annotation {};

    fixture.detectChanges();
  });

  xit('should create', () => {

    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
