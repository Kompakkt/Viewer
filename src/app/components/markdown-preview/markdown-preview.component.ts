import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SecurityContext,
  SimpleChanges,
  inject,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-markdown-preview',
  templateUrl: './markdown-preview.component.html',
  styleUrls: ['./markdown-preview.component.scss'],
  standalone: true,
})
export class MarkdownPreviewComponent implements OnChanges {
  @Input('data')
  public markdown!: string;

  constructor(private sanitizer: DomSanitizer) {}

  #ref = inject<ElementRef<HTMLElement>>(ElementRef);

  public sanitize(markdown: string) {
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, marked(markdown));
    if (!sanitized) return;
    this.#ref.nativeElement.innerHTML = sanitized;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.markdown?.currentValue) this.sanitize(changes.markdown.currentValue.trim());
  }
}
