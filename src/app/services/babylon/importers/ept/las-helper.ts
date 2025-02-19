export const parseHeader = (data: ArrayBuffer) => {
  const reader = new DataView(data);

  const fileSignature = String.fromCharCode(
    reader.getUint8(0),
    reader.getUint8(1),
    reader.getUint8(2),
    reader.getUint8(3),
  );
  const fileSourceId = reader.getUint16(4, true);
  const globalEncoding = reader.getUint16(6, true);
  const projectId = Array.from(new Uint8Array(reader.buffer.slice(8, 24))).map(
    (b) => b.toString(16).padStart(2, "0"),
  );
  const projectIdSections = [
    projectId.slice(0, 4),
    projectId.slice(4, 6),
    projectId.slice(6, 8),
    projectId.slice(8, 10),
    projectId.slice(10),
  ]
    .map((v) => v.join(""))
    .join("-");
  const versionMajor = reader.getUint8(24);
  const versionMinor = reader.getUint8(25);
  const systemIdentifier = String.fromCharCode(
    ...new Uint8Array(reader.buffer.slice(26, 58)),
  ).replace(/\0/g, "");
  const generatingSoftware = String.fromCharCode(
    ...new Uint8Array(reader.buffer.slice(58, 90)),
  ).replace(/\0/g, "");
  const fileCreationDayOfYear = reader.getUint16(90, true);
  const fileCreationYear = reader.getUint16(92, true);
  const headerSize = reader.getUint16(94, true);
  const offsetToPointData = reader.getUint32(96, true);
  const numberOfVariableLengthRecords = reader.getUint32(100, true);
  const pointDataFormatId = reader.getUint8(104) & 0b1111;
  const pointDataRecordLength = reader.getUint16(105, true);
  const numberOfPointRecords = reader.getUint32(107, true);
  const numberOfPointsByReturn = [
    reader.getUint32(111, true),
    reader.getUint32(115, true),
    reader.getUint32(119, true),
    reader.getUint32(123, true),
    reader.getUint32(127, true),
  ].join(" ");
  const scaleFactorX = reader.getFloat64(131, true);
  const scaleFactorY = reader.getFloat64(139, true);
  const scaleFactorZ = reader.getFloat64(147, true);
  const offsetX = reader.getFloat64(155, true);
  const offsetY = reader.getFloat64(163, true);
  const offsetZ = reader.getFloat64(171, true);
  const maxX = reader.getFloat64(179, true);
  const maxY = reader.getFloat64(195, true);
  const maxZ = reader.getFloat64(211, true);
  const minX = reader.getFloat64(187, true);
  const minY = reader.getFloat64(203, true);
  const minZ = reader.getFloat64(219, true);

  return {
    fileSignature,
    fileSourceId,
    globalEncoding,
    projectId: projectIdSections,
    versionMajor,
    versionMinor,
    systemIdentifier,
    generatingSoftware,
    fileCreationDayOfYear,
    fileCreationYear,
    headerSize,
    offsetToPointData,
    numberOfVariableLengthRecords,
    pointDataFormatId,
    pointDataRecordLength,
    numberOfPointRecords,
    numberOfPointsByReturn,
    scaleFactorX,
    scaleFactorY,
    scaleFactorZ,
    offsetX,
    offsetY,
    offsetZ,
    maxX,
    maxY,
    maxZ,
    minX,
    minY,
    minZ,
  };
};

export type LASHeader = ReturnType<typeof parseHeader>;
