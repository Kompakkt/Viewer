import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SkyboxComponent } from './skybox.component';

describe('SkyboxComponent', () => {
  let component: SkyboxComponent;
  let fixture: ComponentFixture<SkyboxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SkyboxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SkyboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
