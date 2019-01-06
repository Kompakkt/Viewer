import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelsettingsComponent } from './modelsettings.component';

describe('ModelsettingsComponent', () => {
  let component: ModelsettingsComponent;
  let fixture: ComponentFixture<ModelsettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModelsettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelsettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
