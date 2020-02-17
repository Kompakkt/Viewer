import { Component } from '@angular/core';

import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-compilation-browser',
  templateUrl: './compilation-browser.component.html',
  styleUrls: ['./compilation-browser.component.scss'],
})
export class CompilationBrowserComponent {
  constructor(public processingService: ProcessingService) {}
}
