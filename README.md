# Kompakkt.Viewer

<p align="center">
    <img src="https://github.com/Kompakkt/Assets/raw/main/viewer-logo.png" alt="Kompakkt Logo" width="600">
</p>

Web Based 3D Viewer and 3D Annotation System.

## Requirements

- **[Bun](https://bun.sh/)** - runtime and package manager. `npm` / `yarn` / `pnpm` are **not** supported.

## Development setup

Clone the repository, then install the dependencies with Bun:

```bash
git clone https://github.com/Kompakkt/Viewer
cd Viewer
bun install
```

Shared code from upstream Kompakkt packages (`@kompakkt/common`, `@kompakkt/komponents`, `@kompakkt/plugins`, `@kompakkt/server-openapi`) is pulled in automatically as git-pinned npm dependencies.

Start the Angular dev server:

```bash
bun start
```

Navigate to `http://localhost:4200/viewer/`. The app will automatically reload if you change any of the source files.

### Selecting a backend

By default the viewer talks to the public Kompakkt server at `https://kompakkt.de/server/`. To point the viewer at a different backend (e.g. a locally running Kompakkt server), edit `src/environment.ts`:

```ts
export const environment = {
  server_url: 'https://kompakkt.de/server/',
  repo_url: 'https://kompakkt.de/',
};
```

Adjust `server_url` to the URL of the Kompakkt server you want the viewer to talk to, and `repo_url` to the corresponding Kompakkt.Repo instance.

## Build

Run `bun run build` to build the project. The build artifacts will be stored in the `dist/viewer/` directory.

## Running the full stack

This repository only contains the Viewer frontend. To run Viewer, Repo and Server together (with all required supporting services such as Redis, Sonic and MongoDB), use the [Kompakkt/Mono](https://github.com/Kompakkt/Mono) environment.
