import { Component, HostBinding, OnDestroy, OnInit, input, output, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subscription, skip } from 'rxjs';

@Component({
    selector: 'k-slide-toggle',
    imports: [],
    templateUrl: './slide-toggle.component.html',
    styleUrl: './slide-toggle.component.scss'
})
export class SlideToggleComponent implements OnInit, OnDestroy {
  label = input.required<string>();
  startingValue = input<boolean>(false);
  checkedChange = output<boolean>();
  checked = signal(this.startingValue());
  checked$ = toObservable(this.checked).pipe(skip(1));

  valueSubscription?: Subscription;
  ngOnInit(): void {
    this.valueSubscription = this.checked$.subscribe(value => {
      this.checkedChange.emit(value);
    });
  }

  ngOnDestroy(): void {
    this.valueSubscription?.unsubscribe();
  }

  toggle() {
    this.checked.update(value => !value);
  }

  @HostBinding('class.active')
  get active() {
    return this.checked();
  }
}
