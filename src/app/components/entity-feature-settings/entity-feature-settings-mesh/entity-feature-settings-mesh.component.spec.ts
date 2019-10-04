import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityFeatureSettingsMeshComponent } from './entity-feature-settings-mesh.component';

describe('EntityFeatureSettingsMeshComponent', () => {
  let component: EntityFeatureSettingsMeshComponent;
  let fixture: ComponentFixture<EntityFeatureSettingsMeshComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EntityFeatureSettingsMeshComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EntityFeatureSettingsMeshComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
