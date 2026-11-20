/**
 * Minimal Well-Known Text (WKT) reader for 3D shape selectors (WktSelector, PolygonZSelector).
 * Kompakkt annotations are anchored at a single point, so a shape is reduced to the centre of
 * its distinct vertices.
 */
import type { Vec3 } from './coordinates';

const HEADER = /^\s*([A-Za-z]+?)(Z|ZM|M)?\s*(Z|ZM|M)?\s*(\(|EMPTY\b)/i;

/** Distinct 3D vertices of a WKT geometry with Z coordinates, or undefined. */
export const wktVertices = (value: string): Vec3[] | undefined => {
  const header = value.match(HEADER);
  if (!header || header[4].toUpperCase() === 'EMPTY') return undefined;
  // "POLYGONZ(" (glued, used by PolygonZSelector) or "POLYGON Z (" / "POINT ZM (".
  const dimension = (header[3] ?? header[2] ?? '').toUpperCase();
  if (dimension !== 'Z' && dimension !== 'ZM') return undefined;

  const body = value.slice(header[0].length - 1);
  const tuples = body
    .replace(/[()]/g, ',')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.split(/\s+/).map(Number));
  if (!tuples.length || tuples.some(t => t.length < 3 || t.some(n => !Number.isFinite(n)))) {
    return undefined;
  }

  const seen = new Set<string>();
  const vertices: Vec3[] = [];
  for (const [x, y, z] of tuples) {
    const key = `${x} ${y} ${z}`;
    if (seen.has(key)) continue; // closing vertices of rings
    seen.add(key);
    vertices.push({ x, y, z });
  }
  return vertices;
};

/** Centre of the distinct vertices of a 3D WKT geometry, or undefined. */
export const wktAnchorPoint = (value: string): Vec3 | undefined => {
  const vertices = wktVertices(value);
  if (!vertices?.length) return undefined;
  const sum = vertices.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y, z: a.z + p.z }), {
    x: 0,
    y: 0,
    z: 0,
  });
  return { x: sum.x / vertices.length, y: sum.y / vertices.length, z: sum.z / vertices.length };
};
