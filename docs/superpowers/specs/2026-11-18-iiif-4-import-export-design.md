# IIIF Presentation API 4.0: Import and Export in the Kompakkt Viewer

- **Date:** 2026-11-18
- **Branch:** `64-feature-iiif-support-for-kompakkt-3d-viewer`
- **Reference:** https://iiif.io/api/presentation/4.0/ (status: 4.0.0 draft, read on 2026-11-18)

## Goal

The viewer should **import** IIIF 4.0 manifests containing 3D Scenes and **export** a Kompakkt entity with its annotations as a **complete IIIF 4.0 manifest**. The export follows the plain spec, with no Kompakkt-specific extensions.

## Current state

- An importer already exists in `src/app/services/processing/processing.service.ts` (starting at `loadIIIF3DManifest`). It supports Scenes, model painting, transforms, PointSelector, lights, PerspectiveCamera with `lookAt`, and Canvas-in-Scene.
- The importer mixes access through `@iiif/3d-manifesto-dev` (fork `Kompakkt/manifesto-3d`) with direct access to `__jsonld`.
- The axis conversion (X flip) is spread across several places, including `src/app/helpers/iiif-data-helper.ts`.
- `annotations-editor.component.ts` currently exports annotations as Kompakkt JSON via `file-saver`.
- There is no test runner yet.

## Decisions

1. Import **and** export.
2. The export produces a **complete manifest**, not just an AnnotationPage.
3. **Plain spec only**: Kompakkt fields with no IIIF equivalent (normal, preview image, `validated`) are dropped on export.
4. The implementation is a **separate module working on raw JSON**. `@iiif/3d-manifesto-dev` is removed at the end.

## Architecture

New directory `src/app/iiif/`:

| File | Responsibility | Depends on |
|---|---|---|
| `types.ts` | TypeScript types for the part of IIIF 4.0 we use: Manifest, Scene, AnnotationPage, Annotation, SpecificResource, PointSelector, Scale/Rotate/TranslateTransform, PerspectiveCamera, lights | – |
| `model.ts` | Babylon-free internal model `IIIFSceneModel`: models with URL, format and transforms, cameras, lights, background, comments with a point and an optional camera, `warnings` | – |
| `coordinates.ts` | The single place for converting between IIIF and Babylon (`pointToBabylon`/`pointToIIIF`, `rotationToBabylon`/`rotationToIIIF`) and between Kompakkt's ArcRotate values (alpha, beta, radius) and Cartesian positions | – |
| `color.ts` | Hex ↔ RGB (0–255) | – |
| `comments.ts` | Pure mapping comment → `IAnnotation` and IIIF camera → `ICameraPerspective` | model, coordinates |
| `parser.ts` | `parseManifest(json): IIIFSceneModel`. Pure function. | types, model |
| `placement.ts` | Pure placement math (Babylon math classes only): IIIF RotateTransform ↔ quaternion, composition of IIIF transforms (used by the importer), decomposition of an effective placement into Scale/Rotate/Translate (used by the export) | coordinates, model |
| `loaded-model-placement.ts` | Babylon-side helper: records the loader's local matrix of each loaded root node (`load3DEntity`) and derives the effective placement from the current world matrices | placement |
| `scene-builder.ts` | Turns `IIIFSceneModel` into a Babylon scene (meshes, camera, lights) and produces `IAnnotation[]` | model, coordinates, BabylonService |
| `exporter.ts` | `exportManifest(input): { manifest, warnings }`. Pure function. | types, coordinates, placement |

### Data flow

- **Import:** URL or JSON from `dialog-iiif-import` → `parseManifest` → `IIIFSceneModel` → `scene-builder` → Babylon scene and Kompakkt annotations. `processing.service.ts` only keeps the call.
- **Export:** An "Export as IIIF 4.0 manifest" button in the annotations editor calls `exportManifest` and saves the result via `saveAs` as `<entity>-iiif-manifest.json`.

## Coordinates

- IIIF is right-handed (+x right, +y up, +z forward). Babylon is left-handed by default.
- **Points:** `(x, y, z)` ↔ `(-x, y, z)`.
- **Rotations** are given in degrees, both in IIIF and in `IEntitySettings.rotation`. Because of the mirroring on the X axis, the rotation around X stays the same and the rotations around Y and Z change sign.
- **RotateTransform order:** IIIF 4.0 defines the angles as Euler angles with ordering x-y-z: the rotation about X is applied first, then Y, then Z, about the fixed axes of the local coordinate space, with the pivot at its origin; positive angles are counter-clockwise. The importer (models, cameras, lights) and the export decomposition both use this order (`placement.ts`). After the X-mirror conversion, the mirrored angles keep the same application order. This is also the order Kompakkt applies `IEntitySettings.rotation` in.
- `scene.useRightHandedSystem` is **not** changed, because that would affect existing Kompakkt scenes.
- **Cameras in Kompakkt:** `cameraPositionInitial.position` and `relatedPerspective.position` hold **no** Cartesian position but the ArcRotate values `x = alpha`, `y = beta`, `z = radius` relative to `target` (see `cameraManager.getInitialPosition`). For IIIF, the exporter computes `target + (r·cos α·sin β, r·cos β, r·sin α·sin β)` in Babylon space and then converts that to IIIF. The importer does the reverse.

## Kompakkt model placement

Kompakkt auto-places every normally loaded entity (`EntitySettingsService.setUpMeshSettingsHelper`): the root meshes are parented to a `center` node, the bounding-box minimum is moved to the origin (unless `settings.position` is set), rotation and scale are applied around a pivot at the bounding-box center, and `translate` is added on top. Later `decomposeMeshSettingsHelper` bakes this helper transform into the root meshes. `referencePoint`, `relatedPerspective` and `cameraPositionInitial` are stored in the resulting world space, so `settings.scale/rotation/translate` alone do not describe where the model is displayed.

The export therefore writes the model's **effective** placement, derived from the real world matrices:

- Right after loading (`load3DEntity`), the local matrix `L` of every parentless root node is recorded (`rememberLoaderMatrices`). For glTF this is the loader's `__root__` with its handedness conversion (scaling `(1, 1, -1)`, 180° about Y); other loaders leave it at identity. It is recorded rather than hard-coded because it differs per loader and cannot be recovered once Kompakkt has re-parented or baked the root.
- On import, the scene builder parents the loaded roots to a TransformNode carrying the IIIF transforms, so the root's world matrix is `W = L · N` (Babylon row vectors: `L` applied first). At export time, `N = L⁻¹ · W` with `W` the root's current world matrix. `N` is decomposed into scale, rotation and translation, converted to IIIF space (points mirrored, scale unchanged, rotation as x-y-z Euler angles) and written as `[ScaleTransform, RotateTransform, TranslateTransform]`. Shear (not expected) is reported as a warning.
- Comment points and cameras stay in world space, so re-importing reproduces the displayed placement exactly. If no effective placement is available, the exporter falls back to the settings transforms with a warning.

## Export mapping

| Kompakkt | IIIF 4.0 |
|---|---|
| Entity title | `Manifest.label`, `Scene.label` (language map, default `none`) |
| `entity.externalFile` or server URL + `entity.processed.high` | Painting annotation with body `Model`; `format` from the file extension (`.glb` → `model/gltf-binary`, `.gltf` → `model/gltf+json`, otherwise a matching MIME type) |
| Effective model placement (see "Kompakkt model placement"; fallback: `settings.scale`, `rotation`, `translate`) | Body as `SpecificResource` with `transform: [ScaleTransform, RotateTransform, TranslateTransform]`; values are rounded to 6 decimals (float noise from the world matrices) and transforms with neutral values are left out |
| Imported IIIF scene (several models) | One painting annotation per model (`…/anno/model/<n>`, manifest order), each with the effective placement of its own meshes. Canvases are not exported (warning). |
| `settings.cameraPositionInitial` | Painting annotation with body `PerspectiveCamera`; position as a PointSelector in the target, `lookAt` as a PointSelector on the camera target; skipped with a warning if position or target is missing or not finite |
| `settings.background.color` | `Scene.backgroundColor` (hex `#RRGGBB`) |
| `settings.lights[]` | `AmbientLight`, `PointLight` or `DirectionalLight` depending on `type`; position as a PointSelector; `intensity` as a `Quantity` (`quantityValue` 0–1, `unit: "relative"`). Known limitations: Kompakkt's PointLight is parented to the active camera, so its stored position is camera-relative but is exported as a fixed scene position; Hemispheric and Directional lights are exported without their direction |
| `IAnnotation` | `commenting` annotation in `Scene.annotations` (embedded AnnotationPage); body `TextualBody` (`value` = description, `label` = title, `format` = `text/markdown`); target `SpecificResource` with `source` = Scene and `selector` = `[PointSelector]` from `referencePoint` |
| `relatedPerspective` | Separate PerspectiveCamera annotation with `behavior: ["hidden"]` (camera resource with its own `id`); the comment points to the camera resource via `scope: [{ id, type: "PerspectiveCamera" }]`. If position or target is missing or not finite, camera and `scope` are left out with a warning |
| `ranking` | Order of the items in the AnnotationPage |
| `referenceNormal`, `preview`, `validated` | dropped |

**IDs:** The spec requires HTTP(S) URIs. The manifest ID is the viewer URL of the entity (`<origin><viewer path>?entity=<entityId>`). All other IDs live under `<origin><viewer path>iiif/<entityId>/` (`…/scene/1`, `…/scene/1/page/1`, `…/scene/1/comment/<annotationId>`, `…/camera/…`). Every ID is unique within the manifest.

`@context` is `http://iiif.io/api/presentation/4/context.json`.

## Import mapping (comments)

- A `commenting` annotation with a PointSelector becomes an `IAnnotation`: `referencePoint` from the point, title and description from the `TextualBody`.
- **With a linked camera**: it becomes `relatedPerspective`. Accepted link forms: `scope` (on the annotation or its target) referencing the camera resource ID (spec form) or the camera annotation ID, and an embedded `contentState` annotation in `target.scope` that paints a camera (form used by the IIIF 3D demo manifests), and an annotation with motivation `activating` whose target is the comment and whose body (a SpecificResource, or a plain reference) points to the camera annotation or camera resource. An explicit `scope` takes precedence over an activating annotation; only the camera link is used, the `action` list is not evaluated.
- **Known limitation:** `perspectiveFromCamera` only uses the camera's PointSelector position and a `lookAt` point. A `lookAt` that references an annotation, and camera transforms (e.g. a RotateTransform instead of `lookAt`), are ignored for comment cameras; the comment point is used as the target instead.
- **Choice bodies:** The first item of a `Choice` is the default. When a Choice offers several cameras, the alternatives are imported as hidden cameras (`<annotationId>#choice-<n>`) of the same choice group, and the viewer shows a camera switcher. Non-camera alternatives (e.g. models) are ignored with a warning. An OrthographicCamera's `viewHeight` sets the view height; without it, the view is fitted to the scene.
- **Shape selectors:** A comment without a PointSelector but with a `WktSelector` or `PolygonZSelector` (3D WKT with Z coordinates, e.g. `POLYGON Z`) is anchored at the centre of the shape's distinct vertices, with a warning; the shape itself is not drawn. 2D WKT is not usable in a Scene and the comment is skipped.
- **Annotations without `id`** get a stable fallback ID `<sceneId>#annotation-<n>` (position in the document) with a warning, so comments, cameras and models stay distinct.
- **SpotLight `angle`** is the spec's half-angle; Babylon receives the full cone angle.
- **Without a camera:** A raycast from outside the model toward the point returns the surface normal. The camera is placed along the normal at a fixed distance and looks at the point.
- Imported annotations are visible and editable in the viewer, but are **not saved to the backend automatically**.

## Error handling

- **Hard errors**, reported through `MessageService` and aborting the import: invalid JSON, no `type: "Manifest"`, no Scene.
- **Soft errors**: The parser collects `warnings[]` for unsupported features (for example `exclude`, nested Scenes, audio, unknown body types and selectors), loads the rest and logs the warnings to the console.
- **Older comment form:** Comments that use `bodyValue` instead of a `TextualBody`, as in the existing demo manifests, are still read.
- **Export:** If the model URL is not public (`blob:`, `file:`, `localhost`), a warning is shown. The file is saved anyway.

## Tests

- **Runner:** `bun test`. New script in `package.json`: `"test": "bun test src/app/iiif"`.
- **Fixtures:** minimal manifests in `src/app/iiif/__fixtures__/` plus, if initialized, the examples from the `demos/iiif-3d` submodule (`git submodule update --init demos/iiif-3d`). If the submodule is missing, those tests are skipped.

Test levels:

1. **`coordinates`:** converting there and back gives the identity; fixed reference values.
2. **`parser`:** for each fixture, the expected number of models, transforms, cameras, lights, comments and warnings.
3. **`exporter`:** required fields present, `@context` set, IDs unique, order matches `ranking`.
4. **Round trip:** `parseManifest(exportManifest(x))` matches the internal model of `x`, apart from the dropped fields.
5. **Manual:** load selected demo manifests in the viewer; check export and re-import in the browser. `scene-builder` is not tested automatically.

## Delivery

Five PRs, each building on the previous one:

1. Test setup, `types.ts`, `coordinates.ts`
2. `parser.ts` and `scene-builder.ts` take over the existing import with no change in behavior; `processing.service.ts` gets slimmer.
3. Import gaps: comments with a linked or computed camera, warnings, more light types
4. `exporter.ts` and the export button in the annotations editor
5. Round-trip tests, removal of `@iiif/3d-manifesto-dev`, README and mapping docs

## Out of scope

- Kompakkt-specific IIIF extensions or a custom `@context`
- Saving imported annotations to the backend
- Timelines, audio emitters, nested Scenes, `exclude` (warning only)
- OrthographicCamera and Canvas-in-Scene are imported but not exported. A Canvas is placed either by a PolygonZSelector (older draft form) or, as in the current IIIF 3D examples, with its top-left corner at the target's PointSelector (the Scene origin without one), extending along +x and -y with one Canvas unit per Scene unit, after the body's transforms. The image is shown on the front side ((TR − TL) × (TL − BL)), the background colour on the back.
- Switching to `useRightHandedSystem`
