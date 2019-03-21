import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {DialogDeleteAnnotationsComponent} from './dialog-delete-annotations.component';
import {MatDialogModule} from '@angular/material';

describe('DialogDeleteAnnotationsComponent', () => {
  let component: DialogDeleteAnnotationsComponent;
  let fixture: ComponentFixture<DialogDeleteAnnotationsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DialogDeleteAnnotationsComponent],
      imports: [
        MatDialogModule
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogDeleteAnnotationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
