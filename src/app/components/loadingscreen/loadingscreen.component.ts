import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LoadingScreenService } from '../../services/babylon/loadingscreen';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-loading-screen',
  templateUrl: './loadingscreen.component.html',
  styleUrls: ['./loadingscreen.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [AsyncPipe],
})
export class LoadingscreenComponent {
  constructor(public loadingScreen: LoadingScreenService) {}
}
