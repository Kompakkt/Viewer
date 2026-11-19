# src/app/components/sidenav/sidenav.component.html
k_sidenav-resize-handle-aria = Resize sidebar

# src/app/components/color-field/color-field.component.html
k_color-field-picker-tooltip = Click to open color picker

# src/app/components/sidenav-menu/sidenav-menu.component.html
k_sidenav-menu-close-tooltip = Close sidebar
k_sidenav-menu-annotation-tooltip = Annotations
k_sidenav-menu-annotation-toggle-tooltip = Toggle annotation
k_sidenav-menu-settings-tooltip = Settings
k_sidenav-menu-settings-toggle-tooltip = Toggle settings
k_sidenav-menu-animations-tooltip = Animations
k_sidenav-menu-animations-toggle-tooltip = Toggle animations
k_sidenav-menu-collections-tooltip = Collections
k_sidenav-menu-collection-browser-toggle-tooltip = Toggle collection browser
k_sidenav-menu-point-cloud-tooltip = Point cloud settings
k_sidenav-menu-point-cloud-toggle-tooltip = Toggle point cloud settings

# src/app/components/menu/camera-settings/camera-settings.component.html
k_camera-settings-title = Camera settings
k_camera-settings-type-label = Type
k_camera-settings-annotation-mode-hint = Switching the camera type is not supported while annotating
k_camera-settings-camera-type-orbit = Orbit
k_camera-settings-camera-type-free = Free
k_camera-settings-speed-label = Speed ({ $speed }x)
k_camera-settings-reset-button = Reset camera

# src/app/components/menu/camera-settings/camera-settings.component.ts
k_camera-settings-notification-orbit-camera = Switched to Orbit camera
k_camera-settings-notification-free-camera = Switched to Free camera
k_camera-settings-notification-camera-reset = Camera has been reset

# src/app/components/menu/menu.component.html
k_menu-camera-settings-tooltip = Camera settings
k_menu-quality-tooltip = Quality
k_menu-quality-high = High
k_menu-quality-medium = Medium
k_menu-quality-low = Low
k_menu-screenshot-tooltip = Screenshot
k_menu-language-tooltip = Select your language
k_menu-fullscreen-enter-tooltip = Enter Fullscreen
k_menu-fullscreen-exit-tooltip = Exit Fullscreen
k_menu-fullscreen-aria = Exit fullscreen mode

# src/app/components/dialogs/dialog-share-annotation/dialog-share-annotation.component.html
k_dialog-share-annotation-title = Share Annotation to Collection
k_dialog-share-annotation-collection-id-hint = To transfer this annotation to a collection, enter the identifier of the target collection.
k_dialog-share-annotation-collection-id-label = Collection identifier
k_dialog-share-annotation-share-button = Share

# src/app/components/dialogs/dialog-share-annotation/dialog-share-annotation.component.ts
k_dialog-share-annotation-entity-not-in-collection-error = The entity of this annotation is not part of the target collection.
k_dialog-share-annotation-connection-refused-error = Connection to entity server refused.
k_dialog-share-annotation-collection-not-found-error = Can not find Collection with ID { $collectionId }.

# src/app/components/point-cloud-settings/point-cloud-settings.component.html
k_point-cloud-settings-title = Point cloud settings
k_point-cloud-settings-level-of-detail-heading = Level of detail
k_point-cloud-settings-level-of-detail-hint = Controls how many levels of the point cloud octree will be loaded.
k_point-cloud-settings-memory-warning = Warning: Increases memory usage and decreases performance.
k_point-cloud-settings-level-label = Level { $current } of { $total }
k_point-cloud-settings-loaded-percentage = Loaded: { $percentage }%
k_point-cloud-settings-points-count = # Points: { $loaded } of { $total }
k_point-cloud-settings-next-level-message = Next level will load { $count } points.
k_point-cloud-settings-load-next-level-button = Load next detail level
k_point-cloud-settings-point-size-heading = Point size
k_point-cloud-settings-point-size-hint = Adjusts how small or how large individual points will be displayed. Has no impact on performance.
k_point-cloud-settings-point-size-label = Point Size: { $size }
k_point-cloud-settings-octree-heading = Show octree boxes
k_point-cloud-settings-octree-hint = Toggle the visibility of boxes displaying the zones of the octree.
k_point-cloud-settings-octree-size-hint = A larger box indicates a lower level of detail, and smaller boxes indicate higher levels of detail.

# src/app/services/babylon/loadingscreen.ts
k_loadingscreen-text = Loading: { $percentage }

# src/app/components/entity-feature-settings/entity-feature-settings.component.html
k_entity-feature-settings-title = Settings
k_entity-feature-settings-mesh-heading = Mesh settings
k_entity-feature-settings-mesh-save-button = Save mesh settings
k_entity-feature-settings-background-lights-heading = Background and lights
k_entity-feature-settings-background-heading = Background
k_entity-feature-settings-skybox-converting-message = Converting skybox...
k_entity-feature-settings-skybox-converting-uploading-message = Converting and uploading skybox...
k_entity-feature-settings-background-color-option = Custom background color
k_entity-feature-settings-skybox-upload-option = Custom skybox (upload)...
k_entity-feature-settings-background-color-label = Background color
k_entity-feature-settings-gradient-effect-label = Gradient-brightness effect
k_entity-feature-settings-micro-surface-label = Micro surface: { $value }
k_entity-feature-settings-background-reset-button = Reset background
k_entity-feature-settings-lights-heading = Lights
k_entity-feature-settings-background-lights-save-button = Save background and lights
k_entity-feature-settings-preview-heading = Preview and initial perspective
k_entity-feature-settings-preview-hint = Please select a nice and fitting camera perspective for your object by moving it to the desired position. Click “Save preview” to set the current view as initial perspective. - Smile!
k_entity-feature-settings-preview-save-button = Save preview and initial perspective
k_entity-feature-settings-preview-image-hint = Click on this image to set a nice and fitting camera perspective
k_entity-feature-settings-confirm-heading = Confirm
k_entity-feature-settings-confirm-message = You set all settings and we celebrate it with this preview.
k_entity-feature-settings-confirm-save-hint = Please save the settings if you are done. Or go back to make changes. Afterwards you may add annotations.
k_entity-feature-settings-export-message = Your settings can now be exported and loaded in the standalone Kompakkt viewer.
k_entity-feature-settings-download-settings-button = Download viewer settings
k_entity-feature-settings-reset-to-default-button = Back to default
k_entity-feature-settings-save-default-button = Save as default
k_entity-feature-settings-video-preview-heading = Preview
k_entity-feature-settings-video-generation-message = Generating preview image and video. This should only take a moment...
k_entity-feature-settings-video-success-message = Video generation successful!
k_entity-feature-settings-video-failed-message = Video generation failed. Only using preview screenshot.
k_entity-feature-settings-skybox-upload-heading = Skybox
k_entity-feature-settings-skybox-uploading-message = Uploading skybox. This should only take a moment...
k_entity-feature-settings-skybox-upload-failed-message = Uploading the skybox to the server failed. Please try again.
k_entity-feature-settings-skybox-upload-success-message = The skybox was uploaded successfully.

# src/app/components/entity-feature-settings/entity-feature-settings-mesh/entity-feature-settings-mesh.component.html
k_entity-feature-settings-mesh-information-heading = Information and helpers
k_entity-feature-settings-mesh-bounding-boxes-heading = Bounding boxes
k_entity-feature-settings-mesh-entity-bounding-boxes-label = Show entity bounding boxes
k_entity-feature-settings-mesh-mesh-bounding-boxes-label = Show mesh bounding boxes
k_entity-feature-settings-mesh-count = Number of meshes: { $count }
k_entity-feature-settings-mesh-axes-heading = Axes
k_entity-feature-settings-mesh-world-axes-label = Show world axes
k_entity-feature-settings-mesh-world-axes-size-label = World axes size: { $size }
k_entity-feature-settings-mesh-local-axes-label = Show local axes
k_entity-feature-settings-mesh-local-axes-size-label = Local axes size: { $size }
k_entity-feature-settings-mesh-ground-heading = Ground
k_entity-feature-settings-mesh-ground-label = Show ground
k_entity-feature-settings-mesh-ground-scale-label = Ground scale: { $scale }
k_entity-feature-settings-mesh-ground-color-label = Ground color
k_entity-feature-settings-mesh-helpers-reset-button = Reset helpers
k_entity-feature-settings-mesh-mirror-heading = Mirror axes
k_entity-feature-settings-mesh-x-axis = X-axis
k_entity-feature-settings-mesh-y-axis = Y-axis
k_entity-feature-settings-mesh-z-axis = Z-axis
k_entity-feature-settings-mesh-mirroring-current = Current mirroring: { $axes }
k_entity-feature-settings-mesh-mirroring-none = Current mirroring: None
k_entity-feature-settings-mesh-mirroring-reset-button = Reset mirroring
k_entity-feature-settings-mesh-scale-heading = Scale
k_entity-feature-settings-mesh-scale-factor-label = Scale factor: { $factor }
k_entity-feature-settings-mesh-size-reset-button = Reset size
k_entity-feature-settings-mesh-rotation-heading = Rotation
k_entity-feature-settings-mesh-rotation-gizmo-label = Use rotation gizmo
k_entity-feature-settings-mesh-rotation-reset-button = Reset rotation

# src/app/components/entity-feature-settings/entity-feature-settings-lights/entity-feature-settings-lights.component.html
k_entity-feature-settings-lights-create-button = Create new light
k_entity-feature-settings-lights-type-label = Light type
k_entity-feature-settings-lights-type-point = Point
k_entity-feature-settings-lights-type-ambient = Ambient
k_entity-feature-settings-lights-type-spot = Spot
k_entity-feature-settings-lights-type-directional = Directional
k_entity-feature-settings-lights-helpers-label = Show helpers
k_entity-feature-settings-lights-position-gizmo-label = Show position gizmo
k_entity-feature-settings-lights-rotation-gizmo-label = Show rotation gizmo
k_entity-feature-settings-lights-jump-tooltip = Jump to light
k_entity-feature-settings-lights-select-tooltip = Select light
k_entity-feature-settings-lights-delete-tooltip = Delete light
k_entity-feature-settings-lights-selected-heading = Selected light settings
k_entity-feature-settings-lights-name-label = Name
k_entity-feature-settings-lights-intensity-label = Intensity: { $value }
k_entity-feature-settings-lights-color-label = Color
k_entity-feature-settings-lights-position-heading = Position
k_entity-feature-settings-lights-rotation-heading = Rotation
k_entity-feature-settings-lights-x-label = X
k_entity-feature-settings-lights-y-label = Y
k_entity-feature-settings-lights-z-label = Z
k_entity-feature-settings-lights-angle-label = Angle: { $angle } / { $max }
k_entity-feature-settings-lights-exponent-label = Exponent: { $value }
k_entity-feature-settings-lights-empty = No light selected

# src/app/components/entity-feature-annotations/annotationwalkthrough/annotationwalkthrough.component.html
k_annotationwalkthrough-title = Annotation Walkthrough
k_annotationwalkthrough-no-title = No title

# src/app/components/entity-feature-annotations/annotations-editor/annotations-editor.component.html
k_annotations-editor-title = Annotations
k_annotations-editor-note-badge = Info
k_annotations-editor-upload-note = Please set and save the settings before you add annotations.
k_annotations-editor-default-mode-note = All annotations you create are default annotations and visible for everyone who can access the entity.
k_annotations-editor-forbidden-note = Default Annotations are not editable for foreign entities. Load entity from a collection to save your annotations to make them visible for others. If you are the owner of this entity do not load it from a collection to edit the default Annotations.
k_annotations-editor-add-hint = To add annotations, simply double-click on the entity.
k_annotations-editor-empty-object = Unknown Object
k_annotations-editor-empty-list = This object has no annotations yet.
k_annotations-editor-export-tooltip = Export all annotations as JSON

# src/app/components/entity-feature-annotations/annotation/annotation-for-editor.component.html
k_annotation-for-editor-no-title = No title
k_annotation-for-editor-saved = saved
k_annotation-for-editor-unsaved = not saved
k_annotation-for-editor-no-description = No description
k_annotation-for-editor-edit-tooltip = Edit annotation
k_annotation-for-editor-reposition-tooltip = Reposition annotation
k_annotation-for-editor-reorder-label = Reorder annotation
k_annotation-for-editor-reorder-first = Move to first position
k_annotation-for-editor-reorder-last = Move to last position
k_annotation-for-editor-reorder-up = One position up
k_annotation-for-editor-reorder-down = One position down
k_annotation-for-editor-copy-tooltip = Copy annotation to collection
k_annotation-for-editor-export-tooltip = Export annotation as JSON
k_annotation-for-editor-fullscreen-tooltip = Show in fullscreen view
k_annotation-for-editor-show-tooltip = Show annotation
k_annotation-for-editor-hide-tooltip = Hide annotation
k_annotation-for-editor-delete-tooltip = Delete annotation

# src/app/components/entity-feature-annotations/annotation/annotation.component.html
k_annotation-no-title = No title
k_annotation-no-description = No description
k_annotation-delete-tooltip = Delete annotation
k_annotation-reposition-tooltip = Reposition annotation
k_annotation-edit-tooltip = Edit annotation
k_annotation-fullscreen-tooltip = Toggle fullscreen

# src/app/components/entity-feature-annotations/annotation-media-browser/media-browser.component.html
k_media-browser-title = Embed external media into the content of the annotation
k_media-browser-url-label = URL
k_media-browser-description-label = Fallback media description
k_media-browser-add-button = Add

# src/app/components/entity-feature-animations/entity-feature-animations.component.html
k_entity-feature-animations-title = Animations
k_entity-feature-animations-hide-empty-label = Hide empty animations
k_entity-feature-animations-empty = No animations in this scene.
k_entity-feature-animations-unnamed = unnamed
k_entity-feature-animations-targets-label = Targeted meshes:
k_entity-feature-animations-focus-tooltip = Focus mesh

# src/app/components/entity-feature-animations/sequence-editor/sequence-editor.component.html
k_sequence-editor-title = Sequence Editor
k_sequence-editor-name-label = Name
k_sequence-editor-demo-note = Demo feature for user testing.
k_sequence-editor-demo-detail = Data model & functionality are subject to changes.
k_sequence-editor-play-tooltip = Play
k_sequence-editor-pause-tooltip = Pause
k_sequence-editor-stop-tooltip = Stop
k_sequence-editor-loop-tooltip = Loop
k_sequence-editor-add-timeline-tooltip = Add Timeline
k_sequence-editor-add-spacer-tooltip = Add Spacer
k_sequence-editor-edit-tooltip = Edit selected item
k_sequence-editor-duplicate-tooltip = Duplicate selected item
k_sequence-editor-remove-tooltip = Remove selected item
k_sequence-editor-import-tooltip = Import timeline
k_sequence-editor-export-label = Export
k_sequence-editor-export-active-option = Export active sequence
k_sequence-editor-export-all-option = Export all sequences
k_sequence-editor-fps-label = FPS
k_sequence-editor-zoom-out-tooltip = Zoom out
k_sequence-editor-zoom-in-tooltip = Zoom in
k_sequence-editor-timeline-empty = Add an animation group from the animations menu on the left, or drag one here from a different timeline
k_sequence-editor-timeline-empty-hint = To create a timeline, add an animation group from the animations menu on the left, or click the respective button above.
k_sequence-editor-hold-tooltip = Hold end state
k_sequence-editor-duration-label = Duration: { $duration }
k_sequence-editor-spacer-heading = Spacer
k_sequence-editor-delete-timeline-tooltip = Delete timeline

# src/app/components/entity-feature-animations/edit-timeline-item-dialog/edit-timeline-item-dialog.component.html
k_edit-timeline-item-dialog-title = Edit item
k_edit-timeline-item-dialog-name = Name: { $name }
k_edit-timeline-item-dialog-duration = Duration: { $duration }
k_edit-timeline-item-dialog-hold-label = Hold end state
k_edit-timeline-item-dialog-new-duration-label = New duration

# src/app/components/entity-feature-animations/animation-group-controls/animation-group-controls.component.html
k_animation-group-controls-stop-button = Stop animation
k_animation-group-controls-play-button = Play animation
k_animation-group-controls-annotation-mode-tooltip = Animation sequences can only be edited in annotation mode
k_animation-group-controls-add-to-sequence-button = Add to sequence editor

# src/app/components/dialogs/dialog-reposition-annotation/dialog-reposition-annotation.component.html
k_dialog-reposition-annotation-title = Reposition annotation
k_dialog-reposition-annotation-changed-hint = You have moved the annotation. Choose whether you want to apply the new position below, or reset to the original position.
k_dialog-reposition-annotation-preview-hint = Applying the position will also generate a new preview image using the updated position.
k_dialog-reposition-annotation-move-hint = Move the annotation by clicking and dragging the annotation on the desired axis.
k_dialog-reposition-annotation-reset-button = Reset
k_dialog-reposition-annotation-apply-button = Apply

# src/app/components/dialogs/dialog-meshsettings/dialog-meshsettings.component.html
k_dialog-meshsettings-title = Finalize mesh settings
k_dialog-meshsettings-lock-hint = Finalizing will lock the following settings forever:
k_dialog-meshsettings-scaling-item = Scaling
k_dialog-meshsettings-rotation-item = Rotation
k_dialog-meshsettings-confirm-question = Are you satisfied with how your object is displayed?
k_dialog-meshsettings-cancel-button = No, cancel and adjust
k_dialog-meshsettings-confirm-button = Yes, finalize

# src/app/components/dialogs/dialog-login/login.component.html
k_login-title = Login
k_login-protected-hint = This content is protected and requires authentication.
k_login-delete-title = Delete annotation
k_login-delete-confirm = Are you sure you want to delete this annotation forever?
k_login-delete-hint = If you are sure, enter your username and password to confirm.
k_login-delete-forever-button = Delete forever
k_login-username-label = Username
k_login-password-label = Password
k_login-failed-message = Login failed

# src/app/components/dialogs/dialog-annotation-editor/dialog-annotation-editor.component.html
k_dialog-annotation-editor-title = Edit annotation
k_dialog-annotation-editor-edit-tab = Edit
k_dialog-annotation-editor-preview-tab = Preview
k_dialog-annotation-editor-title-label = Title
k_dialog-annotation-editor-description-label = Description content

# src/app/components/dialogs/dialog-annotation-editor/dialog-annotation-editor.component.ts
k_dialog-annotation-editor-error-empty = Title and description cannot be empty
k_dialog-annotation-editor-error-same = Title and description cannot be the same

# src/app/components/compilation-browser/compilation-browser.component.html
k_compilation-browser-title = Collection browser
k_compilation-browser-change-order-button = Change order
k_compilation-browser-move-top-tooltip = Move to top
k_compilation-browser-move-up-tooltip = Move one up
k_compilation-browser-move-down-tooltip = Move one down
k_compilation-browser-move-bottom-tooltip = Move to bottom

# src/app/components/bottom-sheet/bottom-sheet.component.html
k_bottom-sheet-resize-handle-aria = Resize bottom sheet

# src/app/services/babylon/skyboxes.ts
k_entity-feature-settings-skybox-preset-default = Default
k_entity-feature-settings-skybox-preset-plaza = Plaza
k_entity-feature-settings-skybox-preset-studio = Studio

# Button texts used by multiple buttons throughout
k_button-back = Back
k_button-cancel = Cancel
k_button-close = Close
k_button-export = Export
k_button-next = Next
k_button-save = Save
