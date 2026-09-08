import { Point, EdgeTag, PolygonEdge, ScaleZone } from '../types/takeoff';

/**
 * Calculates Euclidean distance between two points in pixels
 */
export function distancePixels(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates line length in real-world meters using pixelsPerMeter calibration
 */
export function lineLengthMeters(points: Point[], pixelsPerMeter: number): number {
  if (points.length < 2 || pixelsPerMeter <= 0) return 0;
  let totalPixels = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalPixels += distancePixels(points[i], points[i + 1]);
  }
  return totalPixels / pixelsPerMeter;
}

/**
 * High-precision Shoelace algorithm for polygon area in square meters
 */
export function polygonAreaMeters(points: Point[], pixelsPerMeter: number): number {
  if (points.length < 3 || pixelsPerMeter <= 0) return 0;
  let areaPixels2 = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaPixels2 += points[i].x * points[j].y;
    areaPixels2 -= points[j].x * points[i].y;
  }

  areaPixels2 = Math.abs(areaPixels2) / 2.0;
  // Convert square pixels to square meters:
  const areaM2 = areaPixels2 / (pixelsPerMeter * pixelsPerMeter);
  return areaM2;
}

/**
 * Calculates polygon perimeter in real-world meters
 */
export function polygonPerimeterMeters(points: Point[], pixelsPerMeter: number): number {
  if (points.length < 2 || pixelsPerMeter <= 0) return 0;
  let totalPixels = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    totalPixels += distancePixels(points[i], points[j]);
  }
  return totalPixels / pixelsPerMeter;
}

/**
 * Gets individual polygon edges with length and tag
 */
export function getPolygonEdges(
  points: Point[],
  pixelsPerMeter: number,
  edgeTags?: Record<number, EdgeTag>
): PolygonEdge[] {
  if (points.length < 2) return [];
  const edges: PolygonEdge[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lenPx = distancePixels(points[i], points[j]);
    const lenM = pixelsPerMeter > 0 ? lenPx / pixelsPerMeter : 0;
    const tag = (edgeTags && edgeTags[i]) ? edgeTags[i] : 'none';
    edges.push({
      index: i,
      p1: points[i],
      p2: points[j],
      tag,
      lengthMeters: lenM
    });
  }
  return edges;
}

/**
 * Point-in-polygon test using Jordan Curve / Ray Casting algorithm
 */
export function isPointInsidePolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const { x, y } = point;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if polygon B is entirely inside polygon A
 */
export function isPolygonInsidePolygon(polyB: Point[], polyA: Point[]): boolean {
  if (polyB.length < 1 || polyA.length < 3) return false;
  // Check if all vertices of polyB are inside polyA
  for (const pt of polyB) {
    if (!isPointInsidePolygon(pt, polyA)) {
      return false;
    }
  }
  return true;
}

/**
 * Calculates Roof Pitch Factor: 1 / cos(radians)
 * Example: 30° -> 1 / cos(30° * pi / 180) = 1 / 0.866025 = 1.1547
 */
export function getRoofPitchFactor(pitchDegrees: number): {
  factor: number;
  cosVal: number;
  angleRad: number;
} {
  const angleRad = (pitchDegrees * Math.PI) / 180;
  const cosVal = Math.cos(angleRad);
  const safeCos = Math.max(cosVal, 0.0001);
  return {
    factor: 1 / safeCos,
    cosVal: safeCos,
    angleRad
  };
}

/**
 * Calculates expanded trench offset polygon for a centerline
 */
export function expandCenterline(points: Point[], widthPixels: number): Point[] {
  if (points.length < 2 || widthPixels <= 0) return points;
  const halfWidth = widthPixels / 2;
  const leftSide: Point[] = [];
  const rightSide: Point[] = [];

  for (let i = 0; i < points.length; i++) {
    let dx = 0;
    let dy = 0;

    if (i === 0) {
      dx = points[1].x - points[0].x;
      dy = points[1].y - points[0].y;
    } else if (i === points.length - 1) {
      dx = points[i].x - points[i - 1].x;
      dy = points[i].y - points[i - 1].y;
    } else {
      dx = points[i + 1].x - points[i - 1].x;
      dy = points[i + 1].y - points[i - 1].y;
    }

    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    leftSide.push({
      x: points[i].x + nx * halfWidth,
      y: points[i].y + ny * halfWidth
    });

    rightSide.push({
      x: points[i].x - nx * halfWidth,
      y: points[i].y - ny * halfWidth
    });
  }

  // Construct polygon by traversing left then reversed right
  return [...leftSide, ...rightSide.reverse()];
}

/**
 * Magnet snapping: Snaps mouse point to nearby vertices, midpoints, or orthogonal angles
 */
export interface SnapResult {
  point: Point;
  snapped: boolean;
  type?: 'vertex' | 'midpoint' | 'ortho_h' | 'ortho_v' | 'ortho_45';
  targetPoint?: Point;
}

export function snapPoint(
  rawPoint: Point,
  existingPoints: Point[],
  lastActivePoint?: Point,
  snapDistancePx = 15
): SnapResult {
  // 1. Check Vertex Snapping
  let nearestVertex: Point | null = null;
  let minVertexDist = snapDistancePx;

  for (const pt of existingPoints) {
    const d = distancePixels(rawPoint, pt);
    if (d < minVertexDist) {
      minVertexDist = d;
      nearestVertex = pt;
    }
  }

  if (nearestVertex) {
    return {
      point: { ...nearestVertex },
      snapped: true,
      type: 'vertex',
      targetPoint: nearestVertex
    };
  }

  // 2. Check Orthogonal Snapping from last active point (0°, 90°, 45°)
  if (lastActivePoint) {
    const dx = rawPoint.x - lastActivePoint.x;
    const dy = rawPoint.y - lastActivePoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      // Horizontal lock (dy close to 0)
      if (Math.abs(dy) < snapDistancePx) {
        return {
          point: { x: rawPoint.x, y: lastActivePoint.y },
          snapped: true,
          type: 'ortho_h'
        };
      }
      // Vertical lock (dx close to 0)
      if (Math.abs(dx) < snapDistancePx) {
        return {
          point: { x: lastActivePoint.x, y: rawPoint.y },
          snapped: true,
          type: 'ortho_v'
        };
      }
      // 45 degree diagonal lock (|dx| ~ |dy|)
      if (Math.abs(Math.abs(dx) - Math.abs(dy)) < snapDistancePx) {
        const avg = (Math.abs(dx) + Math.abs(dy)) / 2;
        return {
          point: {
            x: lastActivePoint.x + Math.sign(dx) * avg,
            y: lastActivePoint.y + Math.sign(dy) * avg
          },
          snapped: true,
          type: 'ortho_45'
        };
      }
    }
  }

  return { point: rawPoint, snapped: false };
}

/**
 * Determine which scale zone a point belongs to
 */
export function getActiveScaleZone(point: Point, scaleZones: ScaleZone[]): ScaleZone {
  for (const zone of scaleZones) {
    if (zone.bounds) {
      const b = zone.bounds;
      if (
        point.x >= b.x &&
        point.x <= b.x + b.width &&
        point.y >= b.y &&
        point.y <= b.y + b.height
      ) {
        return zone;
      }
    }
  }
  // Default scale zone
  return scaleZones.find(z => z.isDefault) || scaleZones[0];
}

/**
 * Formats dimension nicely for UI (e.g. 12.45 m or 45.20 m²)
 */
export function formatDim(num: number, decimals = 2): string {
  return (num || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
