import { Component, inject } from '@angular/core';
import { LoadingScreenService } from '../../services/babylon/loadingscreen';

@Component({
  selector: 'app-loading-screen',
  templateUrl: './loadingscreen.component.html',
  styleUrls: ['./loadingscreen.component.scss'],
  imports: [],
})
export class LoadingscreenComponent {
  loadingScreen = inject(LoadingScreenService);
}
