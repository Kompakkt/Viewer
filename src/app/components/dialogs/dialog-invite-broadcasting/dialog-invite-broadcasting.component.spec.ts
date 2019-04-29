import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogInviteBroadcastingComponent } from './dialog-invite-broadcasting.component';

describe('DialogInviteBroadcastingComponent', () => {
  let component: DialogInviteBroadcastingComponent;
  let fixture: ComponentFixture<DialogInviteBroadcastingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogInviteBroadcastingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogInviteBroadcastingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
