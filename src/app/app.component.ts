import { AfterContentChecked, ChangeDetectorRef, Component } from '@angular/core';
import { LoadingscreenComponent } from './components/loadingscreen/loadingscreen.component';
import { SceneComponent } from './components/scene/scene.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [LoadingscreenComponent, SceneComponent],
})
export class AppComponent implements AfterContentChecked {
  constructor(private changeDetector: ChangeDetectorRef) {}

  ngAfterContentChecked(): void {
    this.changeDetector.detectChanges();
  }
}
