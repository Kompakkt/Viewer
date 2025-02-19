import { Effect, Engine, Mesh, Scene, ShaderMaterial } from "@babylonjs/core";
import { Copc } from "copc";

Effect.ShadersStore["pointCloudVertexShader"] = `// pointCloud.vertex.fx
precision highp float;

attribute vec3 position;
attribute vec3 color;

uniform mat4 world;
uniform mat4 viewProjection;
uniform vec3 cameraPosition;
uniform float maxPointSize;
uniform float pointSizeScale;

varying vec3 vColor;
varying vec3 vPosition;
varying float vPointSize;

void main(void) {
    vec4 worldPosition = world * vec4(position, 1.0);
    gl_Position = viewProjection * worldPosition;

    vPosition = worldPosition.xyz;

    // Calculate distance-based point size
    float distance = length(cameraPosition - worldPosition.xyz);

    // Calculate base point size
    float baseSize = pointSizeScale * 1000.0 / distance;

    // Apply depth-aware scaling
    float depthAwareSize = baseSize / gl_Position.w;

    // Clamp the size between a minimum (e.g., 1.0) and the maxPointSize
    gl_PointSize = clamp(depthAwareSize, 1.0, maxPointSize);

    vColor = color;
    vPointSize = gl_PointSize;
}`;

Effect.ShadersStore["pointCloudFragmentShader"] = `// pointCloud.fragment.fx
precision highp float;

varying vec3 vColor;
varying vec3 vPosition;
varying float vPointSize;

uniform mat4 viewProjection;

void main(void) {
  gl_FragColor = vec4(vColor, 1.0);
}`;

export const prepareCopcShaderMaterial = (scene: Scene, copc: Copc) => {
  const pointMat = new ShaderMaterial(
    "pointCloudMaterial",
    scene,
    {
      vertex: "pointCloud",
      fragment: "pointCloud",
    },
    {
      attributes: ["position", "color"],
      uniforms: [
        "world",
        "viewProjection",
        "cameraPosition",
        "pointSizeScale",
        "maxPointSize",
      ],
    },
  );
  pointMat.needAlphaTesting = () => true;
  pointMat.needAlphaBlending = () => true;
  pointMat.setFloat("pointSizeScale", copc.info.spacing * 0.1);
  pointMat.setFloat("maxPointSize", 6);
  pointMat.pointsCloud = true;
  pointMat.pointSize = 1;
  pointMat.needDepthPrePass = true;
  pointMat.alphaMode = Engine.ALPHA_COMBINE;

  scene.getEngine().setDepthBuffer(true);
  scene.onBeforeRenderObservable.add(() => {
    pointMat.setVector3("cameraPosition", scene.activeCamera!.position);
  });

  (window as any)["setPointSize"] = (scale: number, maxSize: number) => {
    pointMat.setFloat("pointSizeScale", scale);
    pointMat.setFloat("maxPointSize", maxSize);
  };

  return pointMat;
};
