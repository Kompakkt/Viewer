import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentBrowserComponent } from './content-browser.component';

describe('ContentBrowserComponent', () => {
  let component: ContentBrowserComponent;
  let fixture: ComponentFixture<ContentBrowserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContentBrowserComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContentBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
