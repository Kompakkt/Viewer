import {
  Animation,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  Color4,
  Effect,
  Engine,
  FreeCamera,
  Mesh,
  MeshBuilder,
  PostProcess,
  RenderTargetTexture,
  Scene,
  ShaderMaterial,
  Stage,
  StandardMaterial,
  Tags,
  TransformNode,
  Vector3,
  VertexBuffer,
  VertexData,
} from '@babylonjs/core';
import {
  ISceneLoaderAsyncResult,
  ISceneLoaderPluginAsync,
  ISceneLoaderProgressEvent,
  SceneLoader,
} from '@babylonjs/core/Loading/sceneLoader';
import { Copc, Getter, Hierarchy } from 'copc';
import { BehaviorSubject, delayWhen, interval } from 'rxjs';
import { createLazPerf } from 'laz-perf';
import { createGetter } from '../copc/copc-getter';
import { parseHeader } from './las-helper';
import { parse } from 'lazts';
import WorkerPool from './worker-pool';
import { getInstance } from './laz-perf';

type Nodes = Record<string, number>;

const createMeshFadeAnimation = (mesh: Mesh, scene: Scene) => {
  const animation = new Animation(
    'fadeIn',
    'visibility',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );

  const keys = [];
  keys.push({
    frame: 0,
    value: 0,
  });
  keys.push({
    frame: 120,
    value: 1,
  });

  animation.setKeys(keys);
  mesh.animations.push(animation);
  scene.beginAnimation(mesh, 0, 120, false);
};

const possibleParentsMap = new Map<string, string[]>();
const possibleParents = (key: string, nodes: Nodes) => {
  if (possibleParentsMap.has(key)) {
    return possibleParentsMap.get(key)!;
  }
  const [level, x, y, z] = key.split('-').map(Number);
  const candidates = [
    [level - 1, x >> 1, y >> 1, z >> 1],
    [level - 1, (x - 1) >> 1, y >> 1, z >> 1],
    [level - 1, x >> 1, (y - 1) >> 1, z >> 1],
    [level - 1, x >> 1, y >> 1, (z - 1) >> 1],
    [level - 1, (x - 1) >> 1, (y - 1) >> 1, z >> 1],
    [level - 1, (x - 1) >> 1, y >> 1, (z - 1) >> 1],
    [level - 1, x >> 1, (y - 1) >> 1, (z - 1) >> 1],
    [level - 1, (x - 1) >> 1, (y - 1) >> 1, (z - 1) >> 1],
  ];

  const mapped = candidates.map(arr => arr.map(v => Math.max(v, 0)).join('-'));
  const filtered = mapped.filter(parentKey => Object.keys(nodes).includes(parentKey));
  const result = Array.from(new Set(filtered));
  possibleParentsMap.set(key, result);
  return result;
};

const recurseParents = (key: string, nodes: Nodes) => {
  const visited = new Set<string>();
  const stack = [key];

  while (stack.length > 0) {
    const currentKey = stack.pop()!;
    if (!visited.has(currentKey)) {
      visited.add(currentKey);
      const parents = possibleParents(currentKey, nodes);
      stack.push(...parents);
    }
  }

  visited.delete(key);

  return Array.from(visited).sort((a, b) => a.localeCompare(b));
};

type EPTSchemaEntry = {
  name: string;
  size: number;
  type: 'signed' | 'unsigned';
  offset?: number;
  scale?: number;
};

type EPTInfoFile = {
  bounds: number[];
  boundsConforming: number[];
  dataType: string;
  hierarchyType: string;
  points: number;
  schema: EPTSchemaEntry[];
  span: number;
  srs: {
    authority: string;
    horizontal: string;
    wkt: string;
  };
  version: string;
};

export class EptImporter implements ISceneLoaderPluginAsync {
  public readonly name = 'CopcImporter';

  public readonly extensions = {
    '.json': { isBinary: false },
    'ept.json': { isBinary: false },
  };

  private workerPool: WorkerPool;
  constructor() {
    this.workerPool = new WorkerPool(
      Array.from(
        { length: 8 },
        () =>
          new Worker(new URL('./ept.worker.ts', import.meta.url), {
            type: 'module',
          }),
      ),
    );
  }

  public static debugMat?: StandardMaterial;
  public static toggleDebugMatVisibility() {
    if (!EptImporter.debugMat) return;
    EptImporter.debugMat.alpha = EptImporter.debugMat.alpha <= 0.5 ? 1 : 0;
  }

  public static pointMat?: StandardMaterial;
  /**
   * Change the point size of the point cloud material.
   * @param size
   * @returns
   */
  public static changePointSize(size: number) {
    if (Number.isNaN(size)) size = 1;
    if (size < 0.1) size = 0.1;
    if (size > 10) size = 10;
    if (!EptImporter.pointMat) return;
    EptImporter.pointMat.pointSize = size;
  }

  public static currentLOD = 0;
  public static maxLOD = 10;
  public static loadNextLevelOfDetail?: () => Promise<void>;

  public static totalLoadedPoints = 0;
  public static totalPoints = Number.MAX_SAFE_INTEGER;
  public static pointsPerLevel?: number[];

  private loadUnloadWorker = new Worker(new URL('./load-unload.worker.ts', import.meta.url), {
    type: 'module',
  });

  public async importMeshAsync(
    meshesNames: any,
    scene: Scene,
    data: string,
    rootUrl: string,
    onProgress?: (event: ISceneLoaderProgressEvent) => void,
    fileName?: string,
  ): Promise<ISceneLoaderAsyncResult> {
    await getInstance();

    const fetchHierarchy = async (key: string) =>
      fetch(`${rootUrl}ept-hierarchy/${key}.json`).then(res => res.json() as Promise<Nodes>);

    const info = JSON.parse(data) as EPTInfoFile;
    const nodes = await fetchHierarchy('0-0-0-0');

    console.log('nodes', nodes);
    EptImporter.maxLOD = Math.max(...Object.keys(nodes).map(key => +key[0]));
    EptImporter.totalPoints = Object.values(nodes).reduce(
      (acc, node) => acc + (node < 0 ? 0 : node),
      0,
    );
    EptImporter.pointsPerLevel = Object.entries(nodes).reduce(
      (acc, [key, value]) => {
        const level = +key[0];
        acc[level] += value < 0 ? 0 : value;
        return acc;
      },
      Array.from({ length: EptImporter.maxLOD + 1 }, () => 0),
    );
    console.log('pointsPerLevel', EptImporter.pointsPerLevel);

    const [minX, minY, minZ, maxX, maxY, maxZ] = info.bounds;

    const rootNode = new TransformNode('root', scene);

    const pointMat = new StandardMaterial(`point-mat`, scene);
    pointMat.diffuseColor = new Color3(1, 1, 1);
    pointMat.emissiveColor = new Color3(1, 1, 1);
    pointMat.disableLighting = true;
    pointMat.pointsCloud = true;
    pointMat.pointSize = 1.5;
    pointMat.alphaMode = Engine.ALPHA_COMBINE;
    EptImporter.pointMat = pointMat;

    const debugMat = new StandardMaterial(`debug-mat`, scene);
    debugMat.wireframe = true;
    debugMat.disableLighting = true;
    debugMat.diffuseColor = new Color3(1, 1, 1);
    debugMat.emissiveColor = new Color3(1, 1, 1);
    debugMat.alpha = 0;
    EptImporter.debugMat = debugMat;

    const nodeMeshMap: Record<string, Mesh> = {};
    const loadingStateMap: Record<string, 'loading' | 'loaded'> = {};

    const importNode = async (key: string) => {
      const [level, x, y, z] = key.split('-').map(Number);
      if (level > EptImporter.currentLOD) return;
      const node = nodes[key];
      if (node === undefined || node < 0) return;

      const loadingState = loadingStateMap[key];
      if (loadingState === 'loading' || loadingState === 'loaded') return;
      loadingStateMap[key] = 'loading';

      const parents = recurseParents(key, nodes);
      for (const parent of parents) {
        await importNode(parent);
      }

      return this.workerPool
        .addTask({ key, url: rootUrl })
        .then(result => {
          if (result.error) {
            delete loadingStateMap[key];
            console.error('Error importing node:', key, result);
            return;
          }
          const { positions, colors } = result;
          loadingStateMap[key] = 'loaded';
          EptImporter.totalLoadedPoints += node;

          const mesh = nodeMeshMap[key];
          if (!mesh) return;
          const vertexData = new VertexData();
          vertexData.positions = positions;
          vertexData.colors = colors;
          vertexData.applyToMesh(mesh, true);

          mesh.material = EptImporter.pointMat!;
          mesh.useVertexColors = true;
          mesh.hasVertexAlpha = true;
          mesh.alphaIndex = 0;
          mesh.visibility = (level + 1) * 0.025;

          createMeshFadeAnimation(mesh, scene);

          return mesh;
        })
        .catch(e => {
          console.warn(e);
          delete loadingStateMap[key];
        });
    };

    const loadTriggerDistanceMap: Record<number, number> = {};
    for (const [key, node] of Object.entries(nodes)) {
      if (!node) continue;
      const [level, x, y, z] = key.split('-').map(Number);
      const mesh = new Mesh(`point-cloud-${key}`, scene);
      mesh.visibility = 1;
      mesh.setParent(rootNode);
      nodeMeshMap[key] = mesh;

      const sizeX = (maxX - minX) / Math.pow(2, level);
      const sizeY = (maxY - minY) / Math.pow(2, level);
      const sizeZ = (maxZ - minZ) / Math.pow(2, level);

      loadTriggerDistanceMap[level] = Math.max(sizeX, sizeY, sizeZ) * 12;

      const debugMesh = MeshBuilder.CreateBox(
        `debug-mesh-${key}`,
        {
          width: sizeX,
          height: sizeY,
          depth: sizeZ,
          updatable: true,
        },
        scene,
      );
      debugMesh.position = new Vector3(
        minX + sizeX * x + sizeX / 2,
        minY + sizeY * y + sizeY / 2,
        minZ + sizeZ * z + sizeZ / 2,
      );

      debugMesh.material = debugMat;
      debugMesh.visibility = 0.05;
      debugMesh.setParent(rootNode);
    }

    const loadedLevels = new Set<number>([0]);
    const loadNodesWithLevel = async (level: number) => {
      if (loadedLevels.has(level)) return;
      loadedLevels.add(level);
      EptImporter.currentLOD = level;

      const sorted = Object.keys(nodes)
        .filter(key => +key[0] === level)
        .toSorted((a, b) => a.localeCompare(b));
      for (let i = 0; i < sorted.length / 8; i++) {
        await Promise.all(sorted.slice(i * 8, (i + 1) * 8).map(key => importNode(key)));
      }
    };
    const loadNextLevelOfDetail = async () => {
      const maxLevel = Math.max(...loadedLevels);
      await loadNodesWithLevel(maxLevel + 1);
    };
    EptImporter.loadNextLevelOfDetail = loadNextLevelOfDetail;

    // Load root level
    const rootMesh = await importNode('0-0-0-0').then(mesh => {
      if (!mesh) return;
      const camera = scene.activeCamera as ArcRotateCamera;
      if (!camera) return;
      const pos = camera.position;
      const radius = mesh.getBoundingInfo().boundingSphere.radiusWorld;
      // recalculateLoadTriggerDistanceMap(radius * 3);
      camera.position = new Vector3(pos.x, pos.y, radius * 2);
      camera.wheelPrecision = 100 / Math.log(radius);
      camera.setTarget(mesh.getBoundingInfo()!.boundingSphere.centerWorld);
      rootNode.rotation = new Vector3(0, 0, -1.58);
      return mesh;
    });
    console.log('rootMesh', rootMesh);
    loadNextLevelOfDetail();

    return {
      meshes: rootMesh ? [rootMesh] : [],
      animationGroups: [],
      geometries: [],
      lights: [],
      particleSystems: [],
      skeletons: [],
      transformNodes: [rootNode],
      spriteManagers: [],
    };
  }

  public async loadAsync(
    scene: Scene,
    data: any,
    rootUrl: string,
    onProgress?: (event: ISceneLoaderProgressEvent) => void,
    fileName?: string,
  ): Promise<void> {}

  public async loadAssetContainerAsync(
    scene: Scene,
    data: any,
    rootUrl: string,
    onProgress?: (event: ISceneLoaderProgressEvent) => void,
    fileName?: string,
  ): Promise<AssetContainer> {
    const container = new AssetContainer(scene);
    return container;
  }
}

if (SceneLoader) {
  console.log('Registering EptImporter');
  SceneLoader.RegisterPlugin(new EptImporter());
}
