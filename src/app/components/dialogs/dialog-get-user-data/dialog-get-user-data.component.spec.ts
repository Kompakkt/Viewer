import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogGetUserDataComponent } from './dialog-get-user-data.component';

describe('DialogGetUserDataComponent', () => {
  let component: DialogGetUserDataComponent;
  let fixture: ComponentFixture<DialogGetUserDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogGetUserDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogGetUserDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
