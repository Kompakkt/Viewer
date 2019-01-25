import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {AnnotationwalkthroughComponent} from './annotationwalkthrough.component';
import {MatIconModule, MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('AnnotationwalkthroughComponent', () => {
  let component: AnnotationwalkthroughComponent;
  let fixture: ComponentFixture<AnnotationwalkthroughComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AnnotationwalkthroughComponent],
      imports: [
        MatIconModule,
        MatSnackBarModule,
        HttpClientModule
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationwalkthroughComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
