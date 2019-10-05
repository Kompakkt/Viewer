import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityFeatureSettingsLightsComponent } from './entity-feature-settings-lights.component';

describe('EntityFeatureSettingsLightsComponent', () => {
  let component: EntityFeatureSettingsLightsComponent;
  let fixture: ComponentFixture<EntityFeatureSettingsLightsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EntityFeatureSettingsLightsComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EntityFeatureSettingsLightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
