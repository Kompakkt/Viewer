import {
    Color3,
    DynamicTexture,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Tags,
    Vector3,
} from 'babylonjs';

export const createBoundingBox = (
    scene: Scene,
    center: Mesh,
    initialSize: Vector3,
    max: Vector3,
) => {
    const boundingBox = MeshBuilder.CreateBox(
        'boundingBox',
        {
            width: initialSize.x,
            height: initialSize.y,
            depth: initialSize.z,
        },
        scene,
    );
    Tags.AddTagsTo(boundingBox, 'boundingBox');
    boundingBox.parent = center;

    boundingBox.material = new StandardMaterial(
        'boundingBoxMat',
        scene,
    );
    boundingBox.material.wireframe = true;
    boundingBox.position.x = max.x - initialSize.x / 2;
    boundingBox.position.y = max.y - initialSize.y / 2;
    boundingBox.position.z = max.z - initialSize.z / 2;
    boundingBox.visibility = 0;
    return boundingBox;
};

// Ground

export const createGround = (
    scene: Scene,
    size: number,
) => {
    const ground = MeshBuilder.CreateGround(
        'ground',
        { height: size, width: size, subdivisions: 1 },
        scene,
    );
    Tags.AddTagsTo(ground, 'ground');
    ground.visibility = 0;
    return ground;
};

// Axis (world and local)
export const createWorldAxis = (
    scene: Scene,
    size: number,
) => {
    const sizeWorldAxis = size;

    const vecOneX = new Vector3(sizeWorldAxis, 0, 0);
    const vecTwoX = new Vector3(sizeWorldAxis * 0.95, sizeWorldAxis * 0.05, 0);
    const vecThreeX = new Vector3(sizeWorldAxis, 0, 0);
    const vecFourX = new Vector3(
        sizeWorldAxis * 0.95,
        sizeWorldAxis * -0.05,
        0,
    );
    const axisX = Mesh.CreateLines(
        'axisX',
        [Vector3.Zero(), vecOneX, vecTwoX, vecThreeX, vecFourX],
        scene,
    );
    Tags.AddTagsTo(axisX, 'worldAxis');
    axisX.color = new Color3(1, 0, 0);
    axisX.visibility = 0;
    const xChar = createTextPlane(
        'X',
        'red',
        sizeWorldAxis / 10,
        'worldAxis',
        'worldAxisX',
        scene,
    );
    xChar.position = new Vector3(sizeWorldAxis * 0.9,  sizeWorldAxis * -0.05, 0);
    xChar.visibility = 0;

    const vecOneY = new Vector3(0, sizeWorldAxis, 0);
    const vecTwoY = new Vector3(sizeWorldAxis * -0.05, sizeWorldAxis * 0.95, 0);
    const vecThreeY = new Vector3(0, sizeWorldAxis, 0);
    const vecFourY = new Vector3(sizeWorldAxis * 0.05, sizeWorldAxis * 0.95, 0);
    const axisY = Mesh.CreateLines(
        'axisY',
        [Vector3.Zero(), vecOneY, vecTwoY, vecThreeY, vecFourY],
        scene,
    );
    Tags.AddTagsTo(axisY, 'worldAxis');
    axisY.color = new Color3(0, 1, 0);
    axisY.visibility = 0;
    const yChar = createTextPlane(
        'Y',
        'green',
        sizeWorldAxis / 10,
        'worldAxis',
        'worldAxisY',
        scene,
    );
    yChar.position = new Vector3(0, sizeWorldAxis * 0.9, sizeWorldAxis * -0.05);
    yChar.visibility = 0;

    const vecOneZ = new Vector3(0, 0, sizeWorldAxis);
    const vecTwoZ = new Vector3(0, sizeWorldAxis * -0.05, sizeWorldAxis * 0.95);
    const vecThreeZ = new Vector3(0, 0, sizeWorldAxis);
    const vecFourZ = new Vector3(0, sizeWorldAxis * 0.05, sizeWorldAxis * 0.95);
    const axisZ = Mesh.CreateLines(
        'axisZ',
        [Vector3.Zero(), vecOneZ, vecTwoZ, vecThreeZ, vecFourZ],
        scene,
    );
    Tags.AddTagsTo(axisZ, 'worldAxis');
    axisZ.color = new Color3(0, 0, 1);
    axisZ.visibility = 0;
    const zChar = createTextPlane(
        'Z',
        'blue',
        sizeWorldAxis / 10,
        'worldAxis',
        'worldAxisZ',
        scene,
    );
    zChar.position = new Vector3(0, sizeWorldAxis * 0.05, sizeWorldAxis *  0.9);
    zChar.visibility = 0;
};

export const createTextPlane = (
    text, color, size, tag, tagIndividual, scene,
) => {
    const dynamicTexture = new DynamicTexture(
        'DynamicTexture',
        50,
        scene,
        true,
    );
    dynamicTexture.hasAlpha = true;
    dynamicTexture.drawText(
        text,
        5,
        40,
        'bold 36px Arial',
        color,
        'transparent',
        true,
    );

    const plane = Mesh.CreatePlane(
        tag,
        size,
        scene,
        true,
    );
    Tags.AddTagsTo(plane, tag);
    Tags.AddTagsTo(plane, tagIndividual);

    const material = new StandardMaterial(
        'TextPlaneMaterial',
        scene,
    );
    material.backFaceCulling = false;
    material.specularColor = new Color3(0, 0, 0);
    material.diffuseTexture = dynamicTexture;
    plane.material = material;

    return plane;
};

export const createlocalAxes = (
    scene: Scene,
    size: number,
    center,
) => {
    const sizeLocalAxis = size;

    const vecOneX = new Vector3(sizeLocalAxis, 0, 0);
    const vecTwoX = new Vector3(sizeLocalAxis * 0.95, 0.05 * sizeLocalAxis, 0);
    const vecThreeX = new Vector3(sizeLocalAxis, 0, 0);
    const vecFourX = new Vector3(
        sizeLocalAxis * 0.95,
        -0.05 * sizeLocalAxis,
        0,
    );
    const local_axisX = Mesh.CreateLines(
        'local_axisX',
        [Vector3.Zero(), vecOneX, vecTwoX, vecThreeX, vecFourX],
        scene,
    );
    Tags.AddTagsTo(local_axisX, 'localAxis');
    local_axisX.color = new Color3(1, 0, 0);
    local_axisX.visibility = 0;
    const xChar = createTextPlane(
        'X',
        'red',
        sizeLocalAxis / 10,
        'localAxis',
        'localAxisX',
        scene,
    );
    xChar.position = new Vector3(0.9 * sizeLocalAxis, -0.05 * sizeLocalAxis, 0);
    xChar.visibility = 0;

    const vecOneY = new Vector3(0, sizeLocalAxis, 0);
    const vecTwoY = new Vector3(-0.05 * sizeLocalAxis, sizeLocalAxis * 0.95, 0);
    const vecThreeY = new Vector3(0, sizeLocalAxis, 0);
    const vecFourY = new Vector3(0.05 * sizeLocalAxis, sizeLocalAxis * 0.95, 0);
    const local_axisY = Mesh.CreateLines(
        'local_axisY',
        [Vector3.Zero(), vecOneY, vecTwoY, vecThreeY, vecFourY],
        scene,
    );
    Tags.AddTagsTo(local_axisY, 'localAxis');
    local_axisY.color = new Color3(0, 1, 0);
    local_axisY.visibility = 0;
    const yChar = createTextPlane(
        'Y',
        'green',
        sizeLocalAxis / 10,
        'localAxis',
        'localAxisY',
        scene,
    );
    yChar.position = new Vector3(0, 0.9 * sizeLocalAxis, -0.05 * sizeLocalAxis);
    yChar.visibility = 0;

    const vecOneZ = new Vector3(0, 0, sizeLocalAxis);
    const vecTwoZ = new Vector3(0, -0.05 * sizeLocalAxis, sizeLocalAxis * 0.95);
    const vecThreeZ = new Vector3(0, 0, sizeLocalAxis);
    const vecFourZ = new Vector3(0, 0.05 * sizeLocalAxis, sizeLocalAxis * 0.95);
    const local_axisZ = Mesh.CreateLines(
        'local_axisZ',
        [Vector3.Zero(), vecOneZ, vecTwoZ, vecThreeZ, vecFourZ],
        scene,
    );
    Tags.AddTagsTo(local_axisZ, 'localAxis');
    local_axisZ.color = new Color3(0, 0, 1);
    local_axisZ.visibility = 0;
    const zChar = createTextPlane(
        'Z',
        'blue',
        sizeLocalAxis / 10,
        'localAxis',
        'localAxisZ',
        scene,
    );
    zChar.position = new Vector3(0, 0.05 * sizeLocalAxis, 0.9 * sizeLocalAxis);
    zChar.visibility = 0;

    // TODO
    local_axisX.parent = center;
    xChar.parent = center;
    local_axisY.parent = center;
    yChar.parent = center;
    local_axisZ.parent = center;
    zChar.parent = center;

};

// End of Axis
