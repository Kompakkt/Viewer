import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CollectionsOverviewComponent} from './collections-overview.component';
import {
  MatCardModule,
  MatDialogModule,
  MatIconModule,
  MatOptionModule,
  MatRadioModule,
  MatSelectModule,
  MatSnackBarModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {ModelComponent} from '../model/model.component';
import {HttpClientModule} from '@angular/common/http';

describe('CollectionsOverviewComponent', () => {
  let component: CollectionsOverviewComponent;
  let fixture: ComponentFixture<CollectionsOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CollectionsOverviewComponent, ModelComponent],
      imports: [
        MatDialogModule,
        MatRadioModule,
        MatOptionModule,
        MatSelectModule,
        FormsModule,
        MatIconModule,
        MatCardModule,
        HttpClientModule,
        MatSnackBarModule]
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
