import {
  Animation,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  Engine,
  ISceneLoaderAsyncResult,
  ISceneLoaderPluginAsync,
  ISceneLoaderProgressEvent,
  Mesh,
  MeshBuilder,
  RegisterSceneLoaderPlugin,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import { Copc } from 'copc';
import { BehaviorSubject } from 'rxjs';
import { prepareCopcShaderMaterial } from './copc-materials';
import { createCOPCWorkerPool } from './worker-pool';
import { PointCloudImporter } from '../common/point-cloud-importer';

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
    '.laz': { isBinary: true },
    '.copc': { isBinary: true },
    '.copc.laz': { isBinary: true },
  };

  private workerPool = createCOPCWorkerPool(
    Array.from(
      { length: 1 },
      () =>
        new Worker(new URL('./copc.worker.ts', import.meta.url), {
          type: 'module',
        }),
    ),
  );

  public async importMeshAsync(
    meshesNames: any,
    scene: Scene,
    data: ArrayBuffer,
    rootUrl: string,
    onProgress?: (event: ISceneLoaderProgressEvent) => void,
    fileName?: string,
  ): Promise<ISceneLoaderAsyncResult> {
    const filename = (() => {
      let url = rootUrl + fileName;
      return url.startsWith('/') ? new URL(url, window.location.origin).toString() : url;
    })();
    const copc = await Copc.create(filename);
    const { nodes, pages } = await Copc.loadHierarchyPage(filename, copc.info.rootHierarchyPage);
    console.log(copc, nodes, pages);

    PointCloudImporter.maxLOD = Math.max(...Object.keys(nodes).map(key => +key[0]));
    PointCloudImporter.totalPoints = Object.values(nodes).reduce(
      (acc, node) => acc + (node?.pointCount ?? 0),
      0,
    );
    PointCloudImporter.pointsPerLevel = Object.entries(nodes).reduce(
      (acc, [key, node]) => {
        const level = +key[0];
        acc[level] += node?.pointCount ?? 0;
        return acc;
      },
      Array.from({ length: PointCloudImporter.maxLOD + 1 }, () => 0),
    );

    const rootNodeMesh = new Mesh('root', scene);

    // const pointMat = prepareCopcShaderMaterial(scene, copc);
    const pointMat = new StandardMaterial(`point-mat`, scene);
    pointMat.diffuseColor = new Color3(1, 1, 1);
    pointMat.emissiveColor = new Color3(1, 1, 1);
    pointMat.disableLighting = true;
    pointMat.pointsCloud = true;
    pointMat.pointSize = 1.5;
    pointMat.alphaMode = Engine.ALPHA_COMBINE;
    PointCloudImporter.pointMat = pointMat;

    const debugMat = new StandardMaterial(`debug-mat`, scene);
    debugMat.wireframe = true;
    debugMat.disableLighting = true;
    debugMat.diffuseColor = new Color3(1, 1, 1);
    debugMat.emissiveColor = new Color3(1, 1, 1);
    debugMat.alpha = 0;
    PointCloudImporter.debugMat = debugMat;

    const nodeMeshMap: Record<string, Mesh> = {};
    const loadingStateMap: Record<string, 'loading' | 'loaded'> = {};

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

    const importNode = async (key: string) => {
      const [level, x, y, z] = key.split('-').map(Number);
      if (level > PointCloudImporter.currentLOD) return;
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
        .addTask({ key, url: filename, nodes })
        .then(result => {
          if (result.error) {
            delete loadingStateMap[key];
            return;
          }
          const { positions, colors } = result;
          loadingStateMap[key] = 'loaded';
          PointCloudImporter.totalLoadedPoints += node.pointCount;

          const mesh = nodeMeshMap[key];
          if (!mesh) return;
          const vertexData = new VertexData();
          vertexData.positions = positions;
          vertexData.colors = colors;
          vertexData.applyToMesh(mesh, true);

          mesh.material = PointCloudImporter.pointMat!;
          mesh.useVertexColors = true;
          mesh.hasVertexAlpha = false;
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
      mesh.setParent(rootNodeMesh);
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
      debugMesh.setParent(rootNodeMesh);
    }

    const loadedLevels = new Set<number>([0]);
    const loadNodesWithLevel = async (level: number) => {
      if (loadedLevels.has(level)) return;
      loadedLevels.add(level);
      PointCloudImporter.currentLOD = level;

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
    PointCloudImporter.loadNextLevelOfDetail = loadNextLevelOfDetail;

    // Load root level
    const rootMesh = await importNode('0-0-0-0').then(mesh => {
      if (!mesh) return;
      const camera = scene.activeCamera as ArcRotateCamera;
      if (!camera) return;
      const pos = camera.position;
      const radius = mesh.getBoundingInfo().boundingSphere.radiusWorld;
      camera.position = new Vector3(pos.x, pos.y, radius * 2);
      camera.wheelPrecision = 100 / Math.log(radius);
      camera.setTarget(mesh.getBoundingInfo()!.boundingSphere.centerWorld);
      return mesh;
    });
    console.log('rootMesh', rootMesh);
    loadNextLevelOfDetail();

    // Recalculate bounding box of rootNodeMesh
    rootNodeMesh.refreshBoundingInfo();

    return {
      meshes: [rootNodeMesh, rootMesh!],
      animationGroups: [],
      geometries: [],
      lights: [],
      particleSystems: [],
      skeletons: [],
      transformNodes: [],
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

console.log('Registering CopcImporter');
RegisterSceneLoaderPlugin(new CopcImporter());
