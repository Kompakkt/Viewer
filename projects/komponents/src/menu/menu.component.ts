import {
  Component,
  ElementRef,
  HostBinding,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { MenuOptionComponent } from '../menu-option/menu-option.component';

@Component({
  selector: 'k-menu',
  standalone: true,
  imports: [MenuOptionComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent implements OnInit, OnDestroy {
  label = input<string>();
  width = input<string>();

  @HostBinding('style.--width') get widthStyle() {
    return this.width() ? `${this.width()}px` : undefined;
  }

  #elementRef = inject<ElementRef<MenuComponent & HTMLElement>>(ElementRef);
  #subscriptions = new Array<Subscription>();

  ngOnInit() {
    const parentElement = this.#elementRef.nativeElement.parentElement;
    if (!parentElement) return;

    parentElement.style.position = 'relative';
    this.#subscriptions.push(
      fromEvent(parentElement, 'mouseenter').subscribe(() => {
        this.#elementRef.nativeElement.classList.add('show');
      }),
      fromEvent(parentElement, 'focus').subscribe(() => {
        this.#elementRef.nativeElement.classList.add('show');
      }),
      fromEvent(parentElement, 'mouseleave').subscribe(() => {
        this.#elementRef.nativeElement.classList.remove('show');
      }),
      fromEvent(parentElement, 'blur').subscribe(() => {
        this.#elementRef.nativeElement.classList.remove('show');
      }),
    );
  }

  ngOnDestroy(): void {
    this.#subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
