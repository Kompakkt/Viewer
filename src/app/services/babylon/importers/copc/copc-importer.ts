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
  StandardMaterial,
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
import { createGetter } from './copc-getter';
import WorkerPool from './worker-pool';
import { BehaviorSubject, delayWhen, interval } from 'rxjs';
import { prepareCopcShaderMaterial } from './copc-materials';

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

export class CopcImporter implements ISceneLoaderPluginAsync {
  public readonly name = 'CopcImporter';

  public readonly extensions = {
    '.laz': { isBinary: false },
    '.copc': { isBinary: false },
    '.copc.laz': { isBinary: false },
  };

  private workerPool: WorkerPool;

  public static readonly stats: Record<
    string,
    {
      pointsLoaded: number;
      totalPoints: number;
    }
  > = {};

  public static readonly maxNodeDepth = (() => {
    const cores = navigator.hardwareConcurrency || 4;
    if (cores <= 4) return 4;
    if (cores <= 12) return 6;
    if (cores <= 24) return 8;
    return Infinity;
  })();

  public static readonly loadingNodes$ = new BehaviorSubject<string[]>([]);

  public static startTime = -1;

  constructor() {
    this.workerPool = new WorkerPool(
      Array.from(
        { length: 1 },
        () =>
          new Worker(new URL('./copc.worker.ts', import.meta.url), {
            type: 'module',
          }),
      ),
    );
  }

  public async importMeshAsync(
    meshesNames: any,
    scene: Scene,
    data: string,
    rootUrl: string,
    onProgress?: (event: ISceneLoaderProgressEvent) => void,
    fileName?: string,
  ): Promise<ISceneLoaderAsyncResult> {
    const { copc, nodes, pages, fileQuery } = JSON.parse(data) as {
      copc: Copc;
      nodes: Hierarchy.Node.Map;
      pages: Hierarchy.Page.Map;
      fileQuery: string;
    };
    console.log(copc, nodes, pages);

    const rootNode = new TransformNode('root', scene);

    const pointMat = prepareCopcShaderMaterial(scene, copc);

    const loadingStateMap: Record<string, 'loading' | 'loaded'> = {};
    setInterval(() => {
      CopcImporter.loadingNodes$.next(
        Object.entries(loadingStateMap)
          .filter(([_, state]) => state === 'loading')
          .map(([key]) => key),
      );
    }, 100);

    console.log(copc);
    const cube = copc.info.cube;
    const [minX, minY, minZ, maxX, maxY, maxZ] = cube;

    const possibleParentsMap = new Map<string, string[]>();
    const possibleParents = (key: string) => {
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

    const recurseParents = (key: string) => {
      const visited = new Set<string>();
      const stack = [key];

      while (stack.length > 0) {
        const currentKey = stack.pop()!;
        if (!visited.has(currentKey)) {
          visited.add(currentKey);
          const parents = possibleParents(currentKey);
          stack.push(...parents);
        }
      }

      visited.delete(key);

      return Array.from(visited).sort((a, b) => a.localeCompare(b));
    };

    const nodeMeshMap: Record<string, Mesh> = {};

    const fileUrl = rootUrl + fileQuery;
    CopcImporter.stats[fileUrl] = {
      totalPoints: copc.header.pointCount,
      pointsLoaded: 0,
    };
    const importNode = async (key: string) => {
      if (CopcImporter.startTime < 0) CopcImporter.startTime = Date.now();
      const [level, x, y, z] = key.split('-').map(Number);
      // if (level !== 0 || x !== 0 || y !== 0 || z !== 0) return;
      if (level > CopcImporter.maxNodeDepth) return;
      const node = nodes[key];
      if (!node) return;
      const loadingState = loadingStateMap[key];
      if (loadingState === 'loading' || loadingState === 'loaded') return;
      loadingStateMap[key] = 'loading';

      const parents = recurseParents(key);
      for (const parent of parents) {
        await importNode(parent);
      }

      return this.workerPool
        .addTask(key, fileUrl, nodes)
        .then(result => {
          if (result.error) {
            delete loadingStateMap[key];
            return;
          }
          const { positions, colors } = result;
          loadingStateMap[key] = 'loaded';
          CopcImporter.stats[fileUrl].pointsLoaded += node.pointCount;
          console.debug(`imported ${key}`);

          const mesh = nodeMeshMap[key];
          if (!mesh) return;
          const vertexData = new VertexData();
          vertexData.positions = positions;
          vertexData.colors = colors;
          vertexData.applyToMesh(mesh, true);

          mesh.material = pointMat;
          mesh.useVertexColors = true;
          mesh.hasVertexAlpha = false;
          // mesh.alphaIndex = 0;

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
      if (level > CopcImporter.maxNodeDepth) continue;
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
      const debugMat = new StandardMaterial(`debug-mat`, scene);
      debugMat.wireframe = true;
      debugMat.disableLighting = true;
      debugMat.diffuseColor = new Color3(1, 1, 1);
      debugMat.emissiveColor = new Color3(1, 1, 1);
      debugMesh.material = debugMat;
      debugMesh.visibility = 0;
      debugMesh.setParent(rootNode);

      const debugCenter = debugMesh.getBoundingInfo().boundingBox.centerWorld;
      setInterval(() => {
        const distance = Vector3.Distance(scene.activeCamera!.position, debugCenter);
        if (!distance) return;
        const isLoaded = loadingStateMap[key] !== undefined;
        const loadTriggerDistance = loadTriggerDistanceMap[level] ?? -1;
        if (distance < loadTriggerDistance && !isLoaded) {
          return importNode(key);
        }

        // console.log(key, distance, distance < loadTriggerDistance);

        const mesh = nodeMeshMap[key];
        if (!mesh) return;
        if (distance < loadTriggerDistance) {
          // mesh.visibility += 0.1;
        } else {
          // mesh.visibility -= 0.1;
        }
        // mesh.visibility = Math.min(1, Math.max(0, mesh.visibility));
        return;
      }, 100);
    }

    importNode('0-0-0-0').then(mesh => {
      if (!mesh) return;
      const camera = scene.activeCamera as ArcRotateCamera;
      if (!camera) return;
      const pos = camera.position;
      const radius = mesh.getBoundingInfo().boundingSphere.radiusWorld;
      // recalculateLoadTriggerDistanceMap(radius * 3);
      camera.position = new Vector3(pos.x, pos.y, radius * 1);
      camera.wheelPrecision = 100 / Math.log(radius);
      camera.setTarget(mesh.getBoundingInfo()!.boundingSphere.centerWorld);
      rootNode.rotation = new Vector3(0, 0, -1.58);
    });

    /*interval(250)
      .pipe(delayWhen(() => this.workerPool.isBusy$))
      .subscribe(() => {
        const keys = Object.keys(nodes)
          .filter((key) => +key[0] <= maxDetailLevel && !loadingStateMap[key])
          .sort((a, b) => a.localeCompare(b));
        const firstKey = keys[0];
        if (!firstKey) return;
        importNode(firstKey);
      });*/

    (window as any)['setRootRotation'] = (x: number, y: number, z: number) => {
      rootNode.rotation = new Vector3(x, y, z);
    };

    (window as any)['importNode'] = importNode;

    return {
      meshes: [...Object.values(nodeMeshMap)],
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
  console.log('Registering CopcImporter');
  SceneLoader.RegisterPlugin(new CopcImporter());
}
