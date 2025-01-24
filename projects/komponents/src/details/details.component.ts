import { AsyncPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { interval } from 'rxjs';

@Component({
    selector: 'k-details',
    imports: [AsyncPipe],
    templateUrl: './details.component.html',
    styleUrl: './details.component.scss'
})
export class DetailsComponent implements AfterViewInit {
  title = input.required<string>();
  startCollapsed = input(false);
  alwaysExpanded = input(false);
  expanded = signal(true);

  gap = input(8);

  contentDiv = viewChild<ElementRef<HTMLDivElement>>('detailsContent');
  contentHeight = signal('auto');

  toggle() {
    if (!this.alwaysExpanded()) {
      this.expanded.set(!this.expanded());
    }
  }

  ngAfterViewInit(): void {
    // TODO: this should only be triggered if the content somehow changes height.
    // However, I could not get this to work with MutationObserver or ngChanges
    // - Kai
    const resize = () =>
      requestAnimationFrame(() => {
        if (!this.expanded()) return;
        const clientHeight = this.contentDiv()?.nativeElement.clientHeight;
        if (!clientHeight) return;
        const oldHeight = +this.contentHeight().replace('px', '').replace('auto', '0');
        if (clientHeight <= oldHeight) return;
        this.contentHeight.set(clientHeight + 'px');
      });

    resize();

    if (this.alwaysExpanded()) {
      this.expanded.set(true);
    } else if (this.startCollapsed()) {
      this.expanded.set(false);
    }

    interval(100).subscribe(() => resize());
  }
}
