import { AsyncPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { interval } from 'rxjs';

@Component({
  selector: 'k-details',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class DetailsComponent implements AfterViewInit {
  title = input.required<string>();
  startCollapsed = input(false);
  expanded = signal(!this.startCollapsed());

  contentDiv = viewChild<ElementRef<HTMLDivElement>>('detailsContent');
  contentHeight = signal('auto');

  toggle() {
    this.expanded.set(!this.expanded());
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

    interval(100).subscribe(() => resize());
  }
}
