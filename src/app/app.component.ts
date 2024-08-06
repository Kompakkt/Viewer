import { Component, ViewChild, ChangeDetectorRef, AfterContentChecked } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { SceneComponent } from './components/scene/scene.component';
import { LoadingscreenComponent } from './components/loadingscreen/loadingscreen.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [LoadingscreenComponent, SceneComponent],
})
export class AppComponent implements AfterContentChecked {
  @ViewChild('sidenav') public sidenav: MatSidenav | undefined;

  constructor(private changeDetector: ChangeDetectorRef) {}

  ngAfterContentChecked(): void {
    this.changeDetector.detectChanges();
  }
}
