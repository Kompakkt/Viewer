import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {SceneComponent} from './scene.component';
import {MatCardModule, MatDialogActions, MatDialogContent, MatFormFieldModule, MatIconModule, MatTooltipModule} from '@angular/material';
import {AnnotationwalkthroughComponent} from '../annotationwalkthrough/annotationwalkthrough.component';
import {AnnotationcardsComponent} from '../annotationcards/annotationcards.component';
import {AnnotationComponent} from '../annotation/annotation.component';

describe('SceneComponent', () => {
  let component: SceneComponent;
  let fixture: ComponentFixture<SceneComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SceneComponent,
        AnnotationComponent,
        AnnotationwalkthroughComponent,
        AnnotationcardsComponent,
        MatDialogContent,
        MatDialogActions],
      imports: [MatCardModule, MatTooltipModule, MatFormFieldModule, MatIconModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SceneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
