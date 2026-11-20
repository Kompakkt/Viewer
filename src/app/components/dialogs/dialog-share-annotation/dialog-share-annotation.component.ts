import { Component, inject, model, linkedSignal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BackendService } from '../../../services/backend/backend.service';
import { MessageService } from '../../../services/message/message.service';
import { TranslateService } from '../../../services/translate/translate.service';
import { ButtonComponent, ButtonRowComponent, InputComponent } from '@kompakkt/komponents';
import { FluentPipe } from '../../../pipes/fluent.pipe';
import { form, FormField, required, submit } from '@angular/forms/signals';

export type DialogShareAnnotationResult = {
  collectionId: string;
  annotationListLength: number;
};

export type DialogShareAnnotationData = {
  entityId: string;
};

@Component({
  selector: 'app-dialog-share-annotation',
  templateUrl: './dialog-share-annotation.component.html',
  styleUrls: ['./dialog-share-annotation.component.scss'],
  imports: [FormField, FluentPipe, InputComponent, ButtonRowComponent, ButtonComponent],
})
export class DialogShareAnnotationComponent {
  #backend = inject(BackendService);
  #message = inject(MessageService);
  #dialogRef = inject<MatDialogRef<DialogShareAnnotationComponent>>(MatDialogRef);
  #translate = inject(TranslateService);
  data = inject<DialogShareAnnotationData>(MAT_DIALOG_DATA);

  model = model('');
  form = form(this.model, path => {
    required(path);
  });

  shareResult = linkedSignal<DialogShareAnnotationResult>(() => ({
    collectionId: this.form().value(),
    annotationListLength: -1,
  }));

  async share() {
    const success = await submit(this.form, async ctx => {
      const targetId = ctx().value();
      const result = await this.#backend.getCompilation(targetId).catch(err => JSON.stringify(err));

      if (typeof result === 'string' || !result) {
        return {
          kind: 'serverError',
          message: result ?? 'Not found',
        };
      }

      if (!result.entities[this.data.entityId]) {
        const translation = this.#translate.getTranslation(
          'k_dialog-share-annotation-entity-not-in-collection-error',
        );
        this.#message.error(translation);
        return {
          kind: 'entityMissingError',
          message: translation,
        };
      }

      this.shareResult.update(data => ({
        ...data,
        annotationListLength: Object.keys(result.annotations).length ?? 0,
      }));

      return undefined;
    });
    if (!success) return;

    this.#dialogRef.close(this.shareResult());
  }

  cancel() {
    this.#dialogRef.close();
  }
}
