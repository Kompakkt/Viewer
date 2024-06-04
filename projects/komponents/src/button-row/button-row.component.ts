import {
  AfterContentInit,
  Component,
  ElementRef,
  HostBinding,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'k-button-row',
  standalone: true,
  imports: [],
  templateUrl: './button-row.component.html',
  styleUrl: './button-row.component.scss',
})
export class ButtonRowComponent implements AfterContentInit {
  el = inject<ElementRef<HTMLDivElement>>(ElementRef);
  buttonCount = signal(2);
  justify = input<'start' | 'center' | 'end' | 'space-between' | 'space-evenly'>('space-evenly');
  gap = input<number | string>(8);

  ngAfterContentInit(): void {
    this.buttonCount.set(this.el.nativeElement.children.length);
  }

  @HostBinding('style.--justify')
  get _justify() {
    return this.justify();
  }

  @HostBinding('style.--gap')
  get _gap() {
    return +this.gap();
  }

  @HostBinding('style.--button-count')
  get _buttonCount() {
    return this.buttonCount();
  }
}
