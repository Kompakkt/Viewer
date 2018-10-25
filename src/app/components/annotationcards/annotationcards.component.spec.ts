import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationcardsComponent } from './annotationcards.component';

describe('AnnotationcardsComponent', () => {
  let component: AnnotationcardsComponent;
  let fixture: ComponentFixture<AnnotationcardsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AnnotationcardsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationcardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
