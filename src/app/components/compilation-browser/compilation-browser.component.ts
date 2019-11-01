import { Component, OnInit } from '@angular/core';

import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-compilation-browser',
  templateUrl: './compilation-browser.component.html',
  styleUrls: ['./compilation-browser.component.scss'],
})
export class CompilationBrowserComponent implements OnInit {
  constructor(public processingService: ProcessingService) {}

  ngOnInit() {}
}
