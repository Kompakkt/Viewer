import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMeshsettingsComponent } from './dialog-meshsettings.component';

describe('DialogMeshsettingsComponent', () => {
  let component: DialogMeshsettingsComponent;
  let fixture: ComponentFixture<DialogMeshsettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogMeshsettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogMeshsettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
