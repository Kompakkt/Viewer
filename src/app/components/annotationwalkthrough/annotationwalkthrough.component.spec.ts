import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationwalkthroughComponent } from './annotationwalkthrough.component';

describe('AnnotationwalkthroughComponent', () => {
  let component: AnnotationwalkthroughComponent;
  let fixture: ComponentFixture<AnnotationwalkthroughComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AnnotationwalkthroughComponent ]
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
