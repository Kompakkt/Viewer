# Kompakkt.Viewer

<p align="center">
    <img src="https://github.com/Kompakkt/Assets/raw/main/viewer-logo.png" alt="Kompakkt Logo" width="600">
</p>

Web Based 3D Viewer and 3D Annotation System.

## Development setup

Requirements: [Bun](https://bun.sh/) and Git.

```
$ git clone --recurse-submodules https://github.com/Kompakkt/Viewer.git
$ cd Viewer
$ git submodule update --init --recursive && bun install
$ bun run start
```

Navigate to `http://localhost:4200/`.

### Submodules

`src/common` ([Kompakkt/Common](https://github.com/Kompakkt/Common)) and
`src/@kompakkt/plugins` ([Kompakkt/Plugins](https://github.com/Kompakkt/Plugins),
contains `@kompakkt/extender`) are Git submodules pinned to commits matching the
current branch. Do not clone them manually.

After switching branches or pulling, run `git submodule update --init --recursive && bun install` again.

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.

## IIIF Presentation API 4.0

Kompakkt can import 3D Scenes from IIIF 4.0 manifests (`?manifest=<URL>` or the import dialog) and
export objects with their annotations as IIIF 4.0 manifests (button in the annotations editor).

- Code: `src/app/iiif/` – the parser, the exporter and the coordinate conversion are Babylon-free and tested.
- Tests: `bun run test` (demo manifests are tested too when the submodule is initialized:
  `git submodule update --init demos/iiif-3d`)
- Kompakkt ↔ IIIF mapping: see `docs/superpowers/specs/2026-11-18-iiif-4-import-export-design.md`
- Dropped on export (no IIIF equivalent): the normal at the annotation point, the preview image, `validated`.
- Imported IIIF scenes with several models are exported with one painting annotation per model; Canvases in a
  scene are not exported.
- IDs: the exported manifest ID is the viewer URL of the entity (`…/viewer/?entity=<id>`); all other IDs
  (cameras, comments, models) live under `…/viewer/iiif/<id>/…`.
- Comments link to their camera via a spec-style `scope` reference to the camera resource. On import,
  `activating` annotations (target: the comment, body: the camera annotation) are understood as well.
