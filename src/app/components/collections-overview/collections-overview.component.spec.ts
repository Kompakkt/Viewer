import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionsOverviewComponent } from './collections-overview.component';

describe('CollectionsOverviewComponent', () => {
  let component: CollectionsOverviewComponent;
  let fixture: ComponentFixture<CollectionsOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CollectionsOverviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CollectionsOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
