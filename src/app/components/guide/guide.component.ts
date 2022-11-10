import { Component, HostBinding, AfterViewInit } from '@angular/core';
import { fromEvent } from 'rxjs';
import { LoadingscreenhandlerService } from 'src/app/services/babylon/loadingscreen';

@Component({
  selector: 'app-guide',
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss'],
})
export class GuideComponent implements AfterViewInit {
  @HostBinding('class.visible')
  get visible() {
    return this.isVisible;
  }

  private isVisible = false;

  constructor(private loadingScreenHandler: LoadingscreenhandlerService) {}

  ngAfterViewInit(): void {
    this.loadingScreenHandler.isLoading$.subscribe(isLoading => {
      if (isLoading) return;

      setTimeout(() => {
        this.isVisible = true;
      }, 1_000);
    });

    fromEvent(document, 'click').subscribe(() => {
      this.isVisible = false;
    });
  }
}
