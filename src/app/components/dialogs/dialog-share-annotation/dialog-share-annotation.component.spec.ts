import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogShareAnnotationComponent } from './dialog-share-annotation.component';

describe('DialogShareAnnotationComponent', () => {
  let component: DialogShareAnnotationComponent;
  let fixture: ComponentFixture<DialogShareAnnotationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogShareAnnotationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogShareAnnotationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
