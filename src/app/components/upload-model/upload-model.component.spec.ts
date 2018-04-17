import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadModelComponent } from './upload-model.component';

describe('UploadModelComponent', () => {
  let component: UploadModelComponent;
  let fixture: ComponentFixture<UploadModelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UploadModelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
