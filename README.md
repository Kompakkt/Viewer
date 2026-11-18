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
