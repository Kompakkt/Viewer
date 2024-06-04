import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { interval } from 'rxjs';

@Component({
  selector: 'k-wizard-step',
  standalone: true,
  imports: [],
  templateUrl: './wizard-step.component.html',
  styleUrl: './wizard-step.component.scss',
})
export class WizardStepComponent implements AfterViewInit {
  label = input.required<string>();
  active = signal(false);
  completed = signal(false);
  counter = signal(0);

  contentDiv = viewChild<ElementRef<HTMLDivElement>>('stepContent');
  contentHeight = signal('auto');

  headerClicked = output<void>();

  @HostBinding('class.step-active')
  get isActiveStep() {
    return this.active();
  }

  @HostBinding('class.step-completed')
  get isCompletedStep() {
    return this.completed();
  }

  ngAfterViewInit(): void {
    // TODO: this should only be triggered if the content somehow changes height.
    // However, I could not get this to work with MutationObserver or ngChanges
    // - Kai
    const resize = () =>
      requestAnimationFrame(() => {
        if (!this.active()) return;
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
