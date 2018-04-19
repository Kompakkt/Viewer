import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {CamerasComponent} from './components/cameras/cameras.component';
import { AnnotationsComponent } from './components/annotations/annotations.component';


describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        SceneComponent,
        CamerasComponent,
        AnnotationsComponent
      ],
    }).compileComponents();
  }));
  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
