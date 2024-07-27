import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

@Component({
  selector: 'k-labelled-checkbox',
  standalone: true,
  imports: [],
  templateUrl: './labelled-checkbox.component.html',
  styleUrl: './labelled-checkbox.component.scss',
})
export class LabelledCheckboxComponent implements OnInit, OnDestroy {
  label = input.required<string>();
  startingValue = input<boolean>(false);
  #startingValue$ = toObservable(this.startingValue);
  checkedChange = output<boolean>();
  checked = signal(false);
  checked$ = toObservable(this.checked);

  checkedSubscription?: Subscription;
  ngOnInit(): void {
    this.checkedSubscription = this.checked$.subscribe(value => {
      this.checkedChange.emit(value);
    });

    this.#startingValue$.subscribe(value => {
      if (value === this.checked()) return;

      this.checked.set(value);
    });
  }

  ngOnDestroy(): void {
    this.checkedSubscription?.unsubscribe();
  }
}
