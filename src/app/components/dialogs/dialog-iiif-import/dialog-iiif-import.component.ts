import { Component, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ButtonComponent, ButtonRowComponent } from 'komponents';
import { ProcessingService } from '../../../services/processing/processing.service';
import { MessageService } from '../../../services/message/message.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dialog-iiif-import',
  templateUrl: './dialog-iiif-import.component.html',
  styleUrls: ['./dialog-iiif-import.component.scss'],
  imports: [CommonModule, FormsModule, ButtonComponent, ButtonRowComponent],
})
export class DialogIiifImportComponent {
  manifestUrl = '';
  manifestJsonText = '';
  isImportingUrl = false;
  manifestFile: File | undefined;
  isImportingFile = false;

  exampleManifestGroups = [
    {
      label: '1. Basic Model in Scene',
      manifests: [
        {
          label: 'Single Model',
          value: 'model_origin',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/1_basic_model_in_scene/model_origin.json',
        },
        {
          label: 'Single Model with background color',
          value: 'model_origin_bgcolor',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/1_basic_model_in_scene/model_origin_bgcolor.json',
        },
      ],
    },
    {
      label: '2. Cameras',
      manifests: [
        {
          label: 'Model with Explicit Perspective Camera',
          value: 'perspective_camera',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/2_cameras/perspective_camera.json',
        },
        {
          label: 'Model with Explicit Perspective Camera Looking at an Annotation',
          value: 'positioned_camera_lookat_anno',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/2_cameras/positioned_camera_lookat_anno.json',
        },
        {
          label: 'Model with Explicit Perspective Camera Looking at a Point',
          value: 'positioned_camera_lookat_point',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/2_cameras/positioned_camera_lookat_point.json',
        },
        {
          label: 'Choice of cameras WARNING use of Choice (TBD)',
          value: 'zz_choice_of_cameras_tbd',
        },
        {
          label: 'Orthographic Camera',
          value: 'zz_orthographic_camera',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/2_cameras/zz_orthographic_camera.json',
        },
      ],
    },
    {
      label: '3. Lights',
      manifests: [
        {
          label: 'Model with Green AmbientLight',
          value: 'ambient_green_light',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/3_lights/ambient_green_light.json',
        },
        {
          label: 'Model with DirectionalLight',
          value: 'direction_light_lookat_positioned',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/3_lights/direction_light_lookat_positioned.json',
        },
        {
          label: 'Model with Rotated DirectionalLight',
          value: 'direction_light_transform_rotate',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/3_lights/direction_light_transform_rotate.json',
        },
        {
          label: 'Model with Multiple Lights with Intensities and Colors',
          value: 'multiple_lights_with_intensities_and_colors',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/3_lights/multiple_lights_with_intensities_and_colors.json',
        },
      ],
    },
    {
      label: '4. Transform and Position',
      manifests: [
        {
          label: 'Single Positioned Model',
          value: 'model_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_position.json',
        },
        {
          label: 'Model shown normally and mirrored',
          value: 'model_transform_negative_scale_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_transform_negative_scale_position.json',
        },
        {
          label: 'Rotated Model',
          value: 'model_transform_rotate_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_transform_rotate_position.json',
        },
        {
          label: 'Rotated Translated Model',
          value: 'model_transform_rotate_translate_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_transform_rotate_translate_position.json',
        },
        {
          label: 'Translated, Scaled Model with original for comparison',
          value: 'model_transform_scale_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_transform_scale_position.json',
        },
        {
          label: 'Scaled, Translated Model with original for comparison',
          value: 'model_transform_scale_translate_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_transform_scale_translate_position.json',
        },
        {
          label: 'Translated Rotated Model',
          value: 'model_transform_translate_rotate_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_transform_translate_rotate_position.json',
        },
        {
          label: 'Scaled Model with original for comparison',
          value: 'model_transform_translate_scale_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/model_transform_translate_scale_position.json',
        },
        {
          label: 'Whale Cranium and Mandible Positioned',
          value: 'whale_cranium_and_mandible_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/whale_cranium_and_mandible_position.json',
        },
        {
          label: 'glTF rotation property demonstration (Tipped Astronaut)',
          value: 'tipped_astronaut',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/tipped_astronaut.json',
        },
        {
          label: 'glTF rotation property with IIIF transform (Tipped and Rotated Astronaut)',
          value: 'tipped_and_rotated_astronaut',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/4_transform_and_position/tipped_and_rotated_astronaut.json',
        },
      ],
    },
    {
      label: '5. Nesting',
      manifests: [],
    },
    {
      label: '6. 2D Canvases in Scene',
      manifests: [
        {
          label: 'Scene with a Canvas',
          value: 'iiif_canvas_with_bgcolor_backward',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/6_2d_canvases_in_scene/iiif_canvas_with_bgcolor_backward.json',
        },
        {
          label: 'Scene with a Canvas (2)',
          value: 'iiif_canvas_with_bgcolor_forward',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/6_2d_canvases_in_scene/iiif_canvas_with_bgcolor_forward.json',
        },
      ],
    },
    {
      label: '7. Excluding Model Features',
      manifests: [],
    },
    {
      label: '8. Scenes with Duration',
      manifests: [],
    },
    {
      label: '9. Commenting Annotations',
      manifests: [
        {
          label: 'Single Model with Comment Annotations',
          value: 'astronaut_comment',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/9_commenting_annotations/astronaut_comment.json',
        },
        {
          label: 'Single Model with Multilingual Comment Annotations',
          value: 'astronaut_multilingual_comment',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/9_commenting_annotations/astronaut_multilingual_comment.json',
        },
        {
          label: 'Whale Cranium and Mandible with Point Comment Annotation',
          value: 'whale_comment',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/9_commenting_annotations/whale_comment.json',
        },
        {
          label: 'Whale Cranium and Mandible with Point Comment Annotation and Camera',
          value: 'whale_comment_camera',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/9_commenting_annotations/whale_comment_camera.json',
        },
        {
          label: 'Whale Cranium and Mandible with Point Comment Annotation Oriented Toward Camera',
          value: 'whale_comment_label_body_position',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/9_commenting_annotations/whale_comment_label_body_position.json',
        },
        {
          label:
            'Whale Cranium and Mandible with Point Comment Annotation Oriented Toward Camera (2)',
          value: 'whale_comment_label_body_position_rotate',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/9_commenting_annotations/whale_comment_label_body_position_rotate.json',
        },
        {
          label:
            'Whale Cranium and Mandible with Point and 2D Shape Comment Annotations (2D shape not shown)',
          value: 'whale_comment_point_polygon',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/9_commenting_annotations/whale_comment_point_polygon.json',
        },
      ],
    },
    {
      label: '10. Activating Annotations',
      manifests: [
        {
          label:
            'Single Model with Comment Annotations and Custom Views Per Annotation (Activating Scope)',
          value: 'astronaut_comment_activating_scope',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/10_activating_annotations/astronaut_comment_activating_scope.json',
        },
        {
          label:
            'Single Model with Comment Annotations and Custom Views Per Annotation (Activating Motivation)',
          value: 'astronaut_comment_activating_motivation',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/10_activating_annotations/astronaut_comment_activating_motivation.json',
        },
        {
          label:
            'Whale Cranium and Mandible with Comment Annotations and Custom Per-Anno Views (Activating Annotation)',
          value: 'whale_comment_activating_annotation',
          url: 'https://raw.githubusercontent.com/IIIF/3d/main/manifests/10_activating_annotations/whale_comment_activating_annotation.json',
        },
      ],
    },
  ];

  async importExampleManifest(url: string) {
    try {
      await this.processing.importIIIF3DManifest(url);
      this.closeDialogIfPresent();
    } catch (error) {
      console.error(error);
      this.message.error('Failed to load example manifest.');
    }
  }

  onExampleManifestSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    const selected = this.exampleManifestGroups
      .flatMap(group => group.manifests)
      .find(ex => ex.value === value);
    if (selected?.url) {
      this.importExampleManifest(selected.url);
    }
  }

  constructor(
    @Optional() private dialogRef: MatDialogRef<DialogIiifImportComponent> | null,
    private processing: ProcessingService,
    private message: MessageService,
  ) {}

  private closeDialogIfPresent() {
    this.dialogRef?.close();
  }

  async importFromUrl() {
    const manifestUrl = this.manifestUrl.trim().replace(/^['"]|['"]$/g, '');
    if (!manifestUrl || this.isImportingUrl) return;
    this.isImportingUrl = true;
    try {
      await this.processing.importIIIF3DManifest(manifestUrl);
      this.closeDialogIfPresent();
    } catch (error) {
      console.error(error);
      this.message.error('Manifest could not be loaded from URL.');
    } finally {
      this.isImportingUrl = false;
    }
  }

  onManifestFileSelected(event: Event) {
    this.manifestFile = (event.target as HTMLInputElement).files?.[0];
  }

  async importFromFile(fileInput: HTMLInputElement) {
    const file = this.manifestFile;
    if (!file || this.isImportingFile) return;
    this.isImportingFile = true;
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch (error) {
        console.error(error);
        this.message.error(`"${file.name}" is not a valid JSON file.`);
        return;
      }
      await this.processing.importIIIF3DManifestJson(parsed as object);
      this.manifestFile = undefined;
      fileInput.value = '';
      this.closeDialogIfPresent();
    } catch (error) {
      console.error(error);
      this.message.error('Manifest file could not be imported.');
    } finally {
      this.isImportingFile = false;
    }
  }

  async importFromJsonText() {
    if (!this.manifestJsonText.trim()) return;
    try {
      const parsed = JSON.parse(this.manifestJsonText);
      await this.processing.importIIIF3DManifestJson(parsed);
      this.closeDialogIfPresent();
    } catch (error) {
      console.error(error);
      this.message.error('Invalid JSON manifest.');
    }
  }
}
