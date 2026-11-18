# IIIF Presentation API 4.0: Import und Export im Kompakkt-Viewer

- **Datum:** 2026-11-18
- **Branch:** `64-feature-iiif-support-for-kompakkt-3d-viewer`
- **Referenz:** https://iiif.io/api/presentation/4.0/ (Stand: 4.0.0-Draft, gelesen am 2026-11-18)

## Ziel

Der Viewer soll IIIF-4.0-Manifeste mit 3D-Scenes **importieren** und eine Kompakkt-Entity samt Annotationen als **vollständiges IIIF-4.0-Manifest exportieren**. Der Export hält sich an die reine Spec, ohne Kompakkt-eigene Erweiterungen.

## Ausgangslage

- Ein Import existiert bereits in `src/app/services/processing/processing.service.ts` (ab `loadIIIF3DManifest`). Er unterstützt Scenes, Model-Painting, Transforms, PointSelector, Lichter, PerspectiveCamera mit `lookAt` und Canvas-in-Scene.
- Der Import mischt den Zugriff über `@iiif/3d-manifesto-dev` (Fork `Kompakkt/manifesto-3d`) mit dem direkten Zugriff auf `__jsonld`.
- Die Umrechnung der Achsen (X-Flip) ist über mehrere Stellen verteilt, unter anderem in `src/app/helpers/iiif-data-helper.ts`.
- `annotations-editor.component.ts` exportiert Annotationen bisher als Kompakkt-JSON über `file-saver`.
- Einen Test-Runner gibt es noch nicht.

## Entscheidungen

1. Import **und** Export.
2. Der Export erzeugt ein **komplettes Manifest**, also keine bloße AnnotationPage.
3. Nur **reine Spec**: Kompakkt-Felder ohne Entsprechung in IIIF (Normale, Vorschaubild, `validated`) werden beim Export verworfen.
4. Die Umsetzung erfolgt als **eigenes Modul auf rohem JSON**. `@iiif/3d-manifesto-dev` entfällt am Ende.

## Architektur

Neues Verzeichnis `src/app/iiif/`:

| Datei | Aufgabe | Abhängigkeiten |
|---|---|---|
| `types.ts` | TypeScript-Typen für den genutzten Teil von IIIF 4.0: Manifest, Scene, AnnotationPage, Annotation, SpecificResource, PointSelector, Scale-/Rotate-/TranslateTransform, PerspectiveCamera, Lichter | – |
| `model.ts` | Babylon-freies internes Modell `IIIFSceneModel`: Modelle mit URL, Format und Transforms, Kameras, Lichter, Hintergrund, Kommentare mit Punkt und optionaler Kamera, `warnings` | – |
| `coordinates.ts` | Einzige Stelle für die Umrechnung zwischen IIIF und Babylon (`toBabylon`/`toIIIF` für Punkte und Rotationen) | – |
| `parser.ts` | `parseManifest(json): IIIFSceneModel`. Reine Funktion. | types, model |
| `scene-builder.ts` | Setzt `IIIFSceneModel` in Babylon um (Meshes, Kamera, Lichter) und erzeugt `IAnnotation[]` | model, coordinates, BabylonService |
| `exporter.ts` | `exportManifest(entity, settings, annotations): Manifest`. Reine Funktion. | types, coordinates |

### Datenfluss

- **Import:** URL oder JSON aus `dialog-iiif-import` → `parseManifest` → `IIIFSceneModel` → `scene-builder` → Babylon-Szene und Kompakkt-Annotationen. In `processing.service.ts` bleibt nur der Aufruf.
- **Export:** Ein Button „Als IIIF-Manifest exportieren“ im Annotations-Editor ruft `exportManifest` auf und speichert das Ergebnis per `saveAs` als `<entity>-manifest.json`.

## Koordinaten

- IIIF ist rechtshändig (+x rechts, +y oben, +z nach vorn). Babylon ist standardmäßig linkshändig.
- **Punkte:** `(x, y, z)` ↔ `(-x, y, z)`.
- **Rotationen** werden in Grad angegeben, in IIIF wie in `IEntitySettings.rotation`. Wegen der Spiegelung an der X-Achse bleibt die Rotation um X erhalten, die Rotationen um Y und Z wechseln das Vorzeichen.
- `scene.useRightHandedSystem` wird **nicht** umgestellt, weil das bestehende Kompakkt-Szenen beeinflussen würde.

## Abbildung beim Export

| Kompakkt | IIIF 4.0 |
|---|---|
| Entity-Titel | `Manifest.label`, `Scene.label` (Sprachkarte, Default `none`) |
| `entity.externalFile` bzw. Server-URL + `entity.processed.high` | Painting-Annotation, Body `Model`, `format` aus der Dateiendung (`.glb` → `model/gltf-binary`, `.gltf` → `model/gltf+json`, sonst eine passende MIME-Type-Zuordnung) |
| `settings.scale`, `rotation`, `translate` | Body als `SpecificResource` mit `transform: [ScaleTransform, RotateTransform, TranslateTransform]`; Transforms mit Neutralwerten werden weggelassen |
| `settings.cameraPositionInitial` | Painting-Annotation mit Body `PerspectiveCamera`, Position als PointSelector im Target, `lookAt` verweist auf die Modell-Annotation |
| `settings.background.color` | `Scene.backgroundColor` (Hex `#RRGGBB`) |
| `settings.lights[]` | `AmbientLight`, `PointLight` oder `DirectionalLight` je nach `type`; Position per PointSelector, Intensität soweit von der Spec abgedeckt |
| `IAnnotation` | `commenting`-Annotation in `Scene.annotations` (eingebettete AnnotationPage); Body `TextualBody` (`value` = Beschreibung, `label` = Titel); Target `SpecificResource` mit `source` = Scene und `selector` = `[PointSelector]` aus `referencePoint` |
| `relatedPerspective` | eigene PerspectiveCamera-Annotation mit `behavior: ["hidden"]`; der Kommentar verweist per `scope` auf sie |
| `ranking` | Reihenfolge der Items in der AnnotationPage |
| `referenceNormal`, `preview`, `validated` | entfällt |

**IDs:** Basis ist die öffentliche Entity-URL, sonst `urn:kompakkt:<entityId>`. Daraus werden hierarchische Unter-IDs abgeleitet (`…/scene/1`, `…/scene/1/page/1`, `…/anno/<annotationId>`). Jede ID ist im Manifest eindeutig.

`@context` ist `http://iiif.io/api/presentation/4/context.json`.

## Abbildung beim Import (Kommentare)

- Eine `commenting`-Annotation mit PointSelector wird zu einer `IAnnotation`: `referencePoint` aus dem Punkt, Titel und Beschreibung aus dem `TextualBody`.
- **Mit verknüpfter Kamera** (`scope` auf eine Kamera-Annotation): Daraus wird `relatedPerspective`.
- **Ohne Kamera:** Ein Raycast vom Szenenzentrum durch den Punkt auf das Mesh liefert die Normale. Die Kamera wird entlang der Normale in einem festen Abstand positioniert und blickt auf den Punkt.
- Importierte Annotationen sind im Viewer sichtbar und editierbar, werden aber **nicht automatisch ins Backend** gespeichert.

## Fehlerbehandlung

- **Harte Fehler**, gemeldet über `MessageService` mit Abbruch des Imports: ungültiges JSON, kein `type: "Manifest"`, keine Scene.
- **Weiche Fehler**: Der Parser sammelt `warnings[]` für nicht unterstützte Features (zum Beispiel `exclude`, verschachtelte Scenes, Audio, OrthographicCamera, unbekannte Selektoren), lädt den Rest und gibt die Warnungen in der Konsole aus.
- **Export:** Ist die Modell-URL nicht öffentlich (`blob:`, `file:`, `localhost`), erscheint eine Warnung. Die Datei wird trotzdem gespeichert.

## Tests

- **Runner:** `bun test`. Neues Script in `package.json`: `"test": "bun test src/app/iiif"`.
- **Fixtures:** minimale Manifeste in `src/app/iiif/__fixtures__/` sowie, falls initialisiert, die Beispiele aus dem Submodul `demos/iiif-3d` (`git submodule update --init demos/iiif-3d`). Fehlt das Submodul, werden die zugehörigen Tests übersprungen.

Testebenen:

1. **`coordinates`:** Hin- und Rückrechnung ergeben die Identität; feste Referenzwerte.
2. **`parser`:** Für jede Fixture die erwartete Anzahl an Modellen, Transforms, Kameras, Lichtern, Kommentaren und Warnungen.
3. **`exporter`:** Pflichtfelder vorhanden, `@context` gesetzt, IDs eindeutig, Reihenfolge entspricht dem `ranking`.
4. **Round-Trip:** `parseManifest(exportManifest(x))` entspricht dem internen Modell von `x`, ohne die verworfenen Felder.
5. **Manuell:** ausgewählte Demo-Manifeste im Viewer laden; Export und Re-Import im Browser prüfen. `scene-builder` wird nicht automatisiert getestet.

## Lieferung

Fünf aufeinander aufbauende PRs:

1. Test-Setup, `types.ts`, `coordinates.ts`
2. `parser.ts` und `scene-builder.ts` übernehmen den bestehenden Import ohne Verhaltensänderung; `processing.service.ts` wird verschlankt.
3. Lücken im Import: Kommentare mit verknüpfter oder berechneter Kamera, Warnungen, weitere Lichttypen
4. `exporter.ts` und der Export-Button im Annotations-Editor
5. Round-Trip-Tests, Entfernen von `@iiif/3d-manifesto-dev`, README und Doku der Abbildung

## Außerhalb des Umfangs

- Kompakkt-eigene IIIF-Erweiterungen bzw. ein eigener `@context`
- Speichern importierter Annotationen im Backend
- Timelines, Audio-Emitter, verschachtelte Scenes, OrthographicCamera (nur Warnung)
- Umstellung auf `useRightHandedSystem`
