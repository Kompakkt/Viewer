import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationcardsComponent } from './annotationcards.component';
import {AnnotationComponent} from '../annotation/annotation.component';
import {FormsModule} from '@angular/forms';
import {MatCardModule, MatFormFieldModule, MatIconModule, MatSnackBarModule, MatTooltipModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('AnnotationcardsComponent', () => {
  let component: AnnotationcardsComponent;
  let fixture: ComponentFixture<AnnotationcardsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AnnotationcardsComponent, AnnotationComponent],
      imports: [
        FormsModule,
        MatFormFieldModule,
        MatCardModule,
        MatIconModule,
        MatTooltipModule,
        MatSnackBarModule,
        HttpClientModule]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationcardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
