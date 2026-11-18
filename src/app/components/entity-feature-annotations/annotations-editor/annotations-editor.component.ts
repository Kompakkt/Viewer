import { AsyncPipe } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { saveAs } from 'file-saver';
import { ButtonComponent, TooltipDirective } from 'komponents';
import { combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { exportManifest } from '../../../iiif/exporter';
import { getEffectiveModelTransform } from '../../../iiif/loaded-model-placement';
import { MessageService } from '../../../services/message/message.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
import { AnnotationComponentForEditorComponent } from '../annotation/annotation-for-editor.component';
import { AnnotationComponent } from '../annotation/annotation.component';

const isIIIFExportableMediaType = (mediaType: string | undefined) =>
  mediaType === 'model' || mediaType === 'entity';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss'],
  imports: [
    AnnotationComponentForEditorComponent,
    MatIcon,
    AsyncPipe,
    TranslatePipe,
    TooltipDirective,
    ButtonComponent,
  ],
})
export class AnnotationsEditorComponent {
  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent> | undefined;

  public annotations = inject(AnnotationService);
  public processing = inject(ProcessingService);
  public userdata = inject(UserdataService);
  private message = inject(MessageService);

  // external
  public isAnnotatingAllowed$ = this.processing.hasAnnotationAllowance$;

  public currentAnnotations$ = this.annotations.currentAnnotations$;

  annotationCount$ = this.currentAnnotations$.pipe(map(arr => arr.length));

  objectName$ = this.processing.entity$.pipe(map(entity => entity?.name));

  /** IIIF export is only offered for 3D models */
  isIIIFExportable$ = this.processing.mediaType$.pipe(map(isIIIFExportableMediaType));

  isDefault$ = combineLatest([
    this.processing.hasAnnotationAllowance$,
    this.processing.compilationLoaded$,
  ]).pipe(
    map(
      ([isAnnotatingAllowed, isCompilationLoaded]) => isAnnotatingAllowed && !isCompilationLoaded,
    ),
  );

  isForbidden$ = combineLatest([
    this.processing.isInUpload$,
    this.processing.hasAnnotationAllowance$,
    this.processing.compilationLoaded$,
    this.processing.defaultEntityLoaded$,
  ]).pipe(map(arr => arr.every(boolean => !boolean)));

  exportAnnotations() {
    firstValueFrom(this.currentAnnotations$).then(arr => {
      saveAs(
        new Blob([JSON.stringify(arr)], {
          type: 'text/plain;charset=utf-8',
        }),
        'annotations.json',
      );
    });
  }

  async exportIIIFManifest() {
    const [entity, annotations, settings] = await Promise.all([
      firstValueFrom(this.processing.entity$),
      firstValueFrom(this.currentAnnotations$),
      firstValueFrom(this.processing.settings$),
    ]);
    if (!entity) return;
    if (!isIIIFExportableMediaType(entity.mediaType)) {
      this.message.error('IIIF export is only available for 3D models.');
      return;
    }

    const resolvedUrl = this.processing.resolveEntityModelUrl(entity);
    if (!resolvedUrl) {
      this.message.error(
        'This object has no single model file that could be exported (IIIF scenes with several models are not supported).',
      );
      return;
    }
    const modelUrl = new URL(resolvedUrl, window.location.href).toString();

    const viewerBase = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}`;
    const entityId = encodeURIComponent(String(entity._id));

    // Kompakkt auto-places the model; export where it is actually displayed.
    const placement = getEffectiveModelTransform(this.processing.meshes$.getValue());

    const { manifest, warnings: exportWarnings } = exportManifest({
      entityId: String(entity._id),
      entityName: entity.name,
      modelUrl,
      settings: settings.localSettings,
      modelTransform: placement.transform,
      annotations,
      manifestId: `${viewerBase}?entity=${entityId}`,
      baseId: `${viewerBase}iiif/${entityId}`,
    });
    const warnings = [...placement.warnings, ...exportWarnings];
    warnings.forEach(warning => console.warn('[IIIF export]', warning));
    if (warnings.length) {
      const more = warnings.length > 1 ? ` (+${warnings.length - 1} more, see console)` : '';
      this.message.info(`${warnings[0]}${more}`);
    }

    const fileName = `${entity.name.replace(/[^\w-]+/g, '_') || 'entity'}-iiif-manifest.json`;
    saveAs(
      new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/ld+json;charset=utf-8' }),
      fileName,
    );
  }

  closeNote(event: Event) {
    const target = event.target as HTMLElement;
    if (target) target.parentElement?.remove();
  }
}
