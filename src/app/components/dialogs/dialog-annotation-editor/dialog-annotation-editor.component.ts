import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { ButtonComponent, ButtonRowComponent, InputComponent, TextareaComponent } from 'komponents';
import { AnnotationService } from 'src/app/services/annotation/annotation.service';
import { IAnnotation, IEntity, isAnnotation } from 'src/common';
import { environment } from 'src/environment';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MediaBrowserComponent } from '../../entity-feature-annotations/annotation-media-browser/media-browser.component';
import { MarkdownPreviewComponent } from '../../markdown-preview/markdown-preview.component';
import { ProcessingService } from 'src/app/services/processing/processing.service';
import { UserdataService } from 'src/app/services/userdata/userdata.service';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { ExtenderSlotDirective, ExtenderSlotEvent } from '@kompakkt/extender';
import { BehaviorSubject, map } from 'rxjs';

export interface IDialogData {
  annotation: IAnnotation;
  mode: 'edit' | 'preview';
}

interface IExternalImage {
  description: string;
  url: string;
  mediaType: string;
}

@Component({
  selector: 'app-dialog-annotation-editor',
  templateUrl: './dialog-annotation-editor.component.html',
  styleUrls: ['./dialog-annotation-editor.component.scss'],
  imports: [
    AsyncPipe,
    FormsModule,
    MarkdownPreviewComponent,
    MediaBrowserComponent,
    TranslatePipe,
    TextareaComponent,
    InputComponent,
    ButtonComponent,
    ButtonRowComponent,
    ExtenderSlotDirective,
  ],
})
export class DialogAnnotationEditorComponent {
  @ViewChild('annotationDescription')
  private annotationDescription?: TextareaComponent;

  @ViewChild('embeddablesSlot')
  private embeddablesSlot?: ElementRef<HTMLDivElement>;

  public dialogRef = inject(MatDialogRef<DialogAnnotationEditorComponent>);
  public dialogData = inject<IDialogData>(MAT_DIALOG_DATA);
  public annotationService = inject(AnnotationService);
  public processing = inject(ProcessingService);
  public userdata = inject(UserdataService);

  public modes = {
    edit: 'Edit',
    preview: 'Preview',
  };
  public currentMode = signal<keyof typeof this.modes>(this.dialogData.mode);
  public annotation$ = new BehaviorSubject<IAnnotation | undefined>(this.dialogData.annotation);

  public annotationValidationErrors$ = this.annotation$.pipe(
    map(annotation => {
      if (!annotation) return false;
      const { title, description } = annotation.body.content;
      if (!title.trim() || !description.trim()) return 'Title and description cannot be empty';
      if (title.trim() === description.trim()) return 'Title and description cannot be the same';
      return false;
    }),
  );

  private serverUrl = environment.server_url;

  public canUserEdit = toSignal(this.processing.hasAnnotationAllowance$);
  public canUserDelete = computed(() => {
    if (!this.canUserEdit()) return false;
    const annotation = this.dialogData.annotation;
    if (!this.userdata.isAnnotationOwner(annotation)) return false;
    return true;
  });

  constructor() {
    effect(() => {
      const mode = this.currentMode();
      this.dialogRef.disableClose = mode === 'edit';
    });
  }

  public handleEmbeddablesEvent(event: ExtenderSlotEvent) {
    const annotation = event.event.detail;
    if (!isAnnotation(annotation)) return;
    console.log('Got new annotation from embeddables', annotation, event);
    this.annotation$.next(annotation);
  }

  private updateAnnotationContent(update: { title?: string; description?: string }) {
    const annotation = this.annotation$.getValue();
    if (!annotation) return;
    this.annotation$.next({
      ...annotation,
      body: {
        ...annotation.body,
        content: {
          ...annotation.body.content,
          title: update.title ? update.title : annotation.body.content.title,
          description: update.description
            ? update.description
            : annotation.body.content.description,
        },
      },
    });
  }

  public addEntitySwitch(entity: IEntity | IExternalImage) {
    switch (entity.mediaType) {
      case 'externalImage':
        this.addExternalImage(entity as IExternalImage);
        break;

      case 'video':
      case 'audio':
      case 'image':
      case 'text':
      case 'entity':
      case 'model':
        this.addEntity(entity as IEntity);
        break;
      default:
        console.log(`Unknown media type ${entity.mediaType}`);
    }
  }

  private getCaretPosition() {
    const textarea = this.annotationDescription?.textarea();

    if (!textarea) return { start: 0, value: '' };
    textarea.nativeElement.focus();

    return {
      start: textarea.nativeElement.selectionStart,
      value: textarea.nativeElement.value,
    };
  }

  private createMarkdown(mdElement: string) {
    const { start, value } = this.getCaretPosition();
    const previous = value.substring(0, start);
    const following = value.substring(start);

    const prependNewline = !previous.endsWith('\n');
    const appendNewline = !following.startsWith('\n');

    let combined = previous;
    if (prependNewline) combined += '\n\n';
    combined += mdElement;
    if (appendNewline) combined += '\n\n';
    combined += following;

    return combined.trim();
  }

  private addExternalImage(image: IExternalImage) {
    this.updateAnnotationContent({
      description: this.createMarkdown(`![alt ${image.description}](${image.url})`),
    });
  }

  private addEntity(entity: IEntity) {
    const target = `${environment.repo_url}/entity/${entity._id}`;
    let url = '';

    let markdown = '';
    switch (entity.mediaType) {
      case 'video':
        if (!entity.dataSource.isExternal) url += `${this.serverUrl}`;
        markdown += `
        <video class="video" controls poster="">
          <source src="${url}/${entity.processed.medium}" type="video/mp4">
        </video>`;
        break;
      case 'audio':
        if (!entity.dataSource.isExternal) url += `${this.serverUrl}`;
        markdown += `
        <audio controls>
          <source src="${url}${entity.processed.medium}" type="audio/mpeg">
        </audio>`;
        break;
      case 'image':
      case 'text':
      case 'model':
      case 'entity':
      default:
        markdown += `
        <a href="${target}" target="_blank">
          <img src="${environment.server_url + entity.settings.preview}" alt="${entity.name}">
        </a>`;
    }

    this.updateAnnotationContent({
      description: this.createMarkdown(markdown),
    });
  }

  public onTextAreaChange(value: string) {
    this.updateAnnotationContent({
      description: value,
    });
  }

  public onTitleChange(value: string) {
    this.updateAnnotationContent({
      title: value,
    });
  }

  public toggleEditViewMode() {
    if (this.currentMode() === 'edit') {
      this.currentMode.set('preview');
    } else {
      this.currentMode.set('edit');
    }
  }

  public close(withData?: boolean) {
    const annotation = this.annotation$.getValue();
    this.dialogRef.close(withData ? annotation : undefined);
  }

  public async deleteAnnotation() {
    await this.annotationService.deleteAnnotation(this.dialogData.annotation);
    this.close(false);
  }
}
