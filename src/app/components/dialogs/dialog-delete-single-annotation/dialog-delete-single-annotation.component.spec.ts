import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogDeleteSingleAnnotationComponent } from './dialog-delete-single-annotation.component';

describe('DialogDeleteSingleAnnotationComponent', () => {
  let component: DialogDeleteSingleAnnotationComponent;
  let fixture: ComponentFixture<DialogDeleteSingleAnnotationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogDeleteSingleAnnotationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogDeleteSingleAnnotationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
