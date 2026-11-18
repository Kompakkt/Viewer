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
| `scene-builder.ts` | Turns `IIIFSceneModel` into a Babylon scene (meshes, camera, lights) and produces `IAnnotation[]` | model, coordinates, BabylonService |
| `exporter.ts` | `exportManifest(input): { manifest, warnings }`. Pure function. | types, coordinates |

### Data flow

- **Import:** URL or JSON from `dialog-iiif-import` → `parseManifest` → `IIIFSceneModel` → `scene-builder` → Babylon scene and Kompakkt annotations. `processing.service.ts` only keeps the call.
- **Export:** An "Export as IIIF 4.0 manifest" button in the annotations editor calls `exportManifest` and saves the result via `saveAs` as `<entity>-iiif-manifest.json`.

## Coordinates

- IIIF is right-handed (+x right, +y up, +z forward). Babylon is left-handed by default.
- **Points:** `(x, y, z)` ↔ `(-x, y, z)`.
- **Rotations** are given in degrees, both in IIIF and in `IEntitySettings.rotation`. Because of the mirroring on the X axis, the rotation around X stays the same and the rotations around Y and Z change sign.
- `scene.useRightHandedSystem` is **not** changed, because that would affect existing Kompakkt scenes.
- **Cameras in Kompakkt:** `cameraPositionInitial.position` and `relatedPerspective.position` hold **no** Cartesian position but the ArcRotate values `x = alpha`, `y = beta`, `z = radius` relative to `target` (see `cameraManager.getInitialPosition`). For IIIF, the exporter computes `target + (r·cos α·sin β, r·cos β, r·sin α·sin β)` in Babylon space and then converts that to IIIF. The importer does the reverse.

## Export mapping

| Kompakkt | IIIF 4.0 |
|---|---|
| Entity title | `Manifest.label`, `Scene.label` (language map, default `none`) |
| `entity.externalFile` or server URL + `entity.processed.high` | Painting annotation with body `Model`; `format` from the file extension (`.glb` → `model/gltf-binary`, `.gltf` → `model/gltf+json`, otherwise a matching MIME type) |
| `settings.scale`, `rotation`, `translate` | Body as `SpecificResource` with `transform: [ScaleTransform, RotateTransform, TranslateTransform]`; transforms with neutral values are left out |
| `settings.cameraPositionInitial` | Painting annotation with body `PerspectiveCamera`; position as a PointSelector in the target, `lookAt` as a PointSelector on the camera target |
| `settings.background.color` | `Scene.backgroundColor` (hex `#RRGGBB`) |
| `settings.lights[]` | `AmbientLight`, `PointLight` or `DirectionalLight` depending on `type`; position as a PointSelector, intensity as far as the spec covers it |
| `IAnnotation` | `commenting` annotation in `Scene.annotations` (embedded AnnotationPage); body `TextualBody` (`value` = description, `label` = title, `format` = `text/markdown`); target `SpecificResource` with `source` = Scene and `selector` = `[PointSelector]` from `referencePoint` |
| `relatedPerspective` | Separate PerspectiveCamera annotation with `behavior: ["hidden"]`; the comment points to it via `scope` |
| `ranking` | Order of the items in the AnnotationPage |
| `referenceNormal`, `preview`, `validated` | dropped |

**IDs:** The base is `urn:kompakkt:<entityId>`. The exporter can optionally receive a public base URL (`baseId`); the UI does not use this in the first step. Hierarchical sub-IDs are derived from the base (`…/scene/1`, `…/scene/1/page/1`, `…/anno/<annotationId>`). Every ID is unique within the manifest.

`@context` is `http://iiif.io/api/presentation/4/context.json`.

## Import mapping (comments)

- A `commenting` annotation with a PointSelector becomes an `IAnnotation`: `referencePoint` from the point, title and description from the `TextualBody`.
- **With a linked camera** (`scope` pointing to a camera annotation): it becomes `relatedPerspective`.
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
- OrthographicCamera and Canvas-in-Scene (PolygonZSelector) stay supported **as before**, but are not extended and not exported.
- Switching to `useRightHandedSystem`
