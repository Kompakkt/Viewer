import { Component } from '@angular/core';
import { LoadingScreenService } from '../../services/babylon/loadingscreen';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-loading-screen',
    templateUrl: './loadingscreen.component.html',
    styleUrls: ['./loadingscreen.component.scss'],
    imports: [AsyncPipe]
})
export class LoadingscreenComponent {
  constructor(public loadingScreen: LoadingScreenService) {}
}
