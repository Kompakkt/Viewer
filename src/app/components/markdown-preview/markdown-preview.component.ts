import { Component, OnChanges, Input, SimpleChanges, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-markdown-preview',
  templateUrl: './markdown-preview.component.html',
  styleUrls: ['./markdown-preview.component.scss'],
})
export class MarkdownPreviewComponent implements OnChanges {
  @Input('data')
  public markdown!: string;

  public content: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  public sanitize(markdown: string) {
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, marked(markdown));
    if (sanitized) this.content = sanitized;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.markdown) this.sanitize(changes.markdown.currentValue.trim());
  }
}
