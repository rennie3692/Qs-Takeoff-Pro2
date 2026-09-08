export interface Point {
  x: number;
  y: number;
}

export type EdgeTag = 'none' | 'ridge' | 'valley' | 'eave' | 'hip' | 'rake';

export interface PolygonEdge {
  index: number;
  p1: Point;
  p2: Point;
  tag: EdgeTag;
  lengthMeters: number;
}

export type RecipeType = 'wall' | 'trench' | 'roof' | 'ceiling' | 'floor' | 'count' | 'custom';

export interface WallRecipeConfig {
  height: number;        // in meters, e.g. 2.8m
  thickness: number;     // in meters, e.g. 0.23m (230mm)
  outputLinear: boolean;
  outputArea: boolean;   // Vertical wall area (Length * Height)
  outputVolume: boolean; // Volume (Length * Height * Thickness)
  outputFormwork: boolean; // 2 faces (2 * Length * Height)
}

export interface TrenchRecipeConfig {
  centerLineWidth: number; // in meters, e.g. 0.6m (600mm)
  depth: number;           // in meters, e.g. 0.85m
  outputCenterline: boolean;
  outputVolume: boolean;   // Volume of trench (Length * Width * Depth)
  outputBeddingArea: boolean; // Trench bottom (Length * Width)
  outputShoring: boolean;  // Side shoring (2 * Length * Depth)
}

export interface RoofRecipeConfig {
  pitchDegrees: number;    // in degrees, e.g. 30
  pitchRatio?: string;     // e.g. "4:12"
  outputPlanArea: boolean;
  outputSlopedArea: boolean; // Plan Area / cos(pitch)
  outputRidge: boolean;
  outputValley: boolean;
  outputEave: boolean;
  outputHip: boolean;
  outputRake: boolean;
}

export interface CeilingRecipeConfig {
  bulkheadDrop: number;   // in meters, e.g. 0.35m
  outputCeilingArea: boolean;
  outputBulkheadTotal: boolean; // Ceiling Area + (Perimeter * Drop)
  outputCornice: boolean;       // Perimeter linear m
}

export interface FloorRecipeConfig {
  thickness: number;      // e.g. 0.15m slab
  outputNetArea: boolean; // Floor area minus voids
  outputPerimeter: boolean;
  outputSkirting: boolean; // Perimeter minus door deductions
  autoDeductDoors: boolean;
  defaultDoorWidth: number; // e.g. 0.9m
  outputSlabVolume: boolean; // Net Area * Thickness
}

export interface CountRecipeConfig {
  itemType: string;       // e.g. "Door D1 (900mm)", "Column C1", "Inspection Chamber"
  width?: number;         // e.g. 0.9m for door deduction
  unitRate?: number;
}

export interface CustomRecipeConfig {
  dimension1Name: string;
  dimension1Value: number;
  dimension2Name: string;
  dimension2Value: number;
  formulaDescription: string;
  outputUnit: string;
}

export type AnyRecipeConfig =
  | WallRecipeConfig
  | TrenchRecipeConfig
  | RoofRecipeConfig
  | CeilingRecipeConfig
  | FloorRecipeConfig
  | CountRecipeConfig
  | CustomRecipeConfig
  | Record<string, any>;

export interface ScaleZone {
  id: string;
  name: string;
  ratio: string;         // e.g. "1:100", "1:50", "1:20"
  pixelsPerMeter: number; // calibration factor
  bounds?: { x: number; y: number; width: number; height: number }; // optional bounding box on drawing
  isDefault: boolean;
}

export interface MeasurementItem {
  id: string;            // internal runtime ID
  uid: string;           // persistent unique ID for revision linking & sync
  name: string;
  folderId: string;
  subFolderId?: string;
  tool: 'line' | 'polygon' | 'rectangle' | 'void' | 'count';
  points: Point[];       // in canvas coordinate space
  color: string;
  scaleZoneId: string;
  recipeType: RecipeType;
  recipeConfig: AnyRecipeConfig;
  edgeTags?: Record<number, EdgeTag>; // edge index -> tag
  hiddenDimensionsPrompted: boolean;
  isUnlinkedMultiplier: boolean;
  isVoid?: boolean;
  parentPolygonId?: string; // If this is a void cutout of another polygon
  revision: 'RevA' | 'RevB';
  syncLinkedId?: string; // Links Rev A and Rev B items
  timestamp: number;
  notes?: string;
}

export interface CalculatedRow {
  id: string;
  measurementId: string;
  measurementUid: string;
  itemName: string;
  folderId: string;
  folderName: string;
  folderMultiplier: number;
  trade: string;
  grossQty: number;
  deductions: number;
  deductionNotes: string;
  netTotal: number;
  factoredTotal: number; // netTotal * multiplier
  unit: string;
  formula: string;       // "The Working" for audit trail
  unitRate?: number;
  totalCost?: number;
  isUnlinked: boolean;
  revision: 'RevA' | 'RevB';
  color: string;
}

export interface FolderNode {
  id: string;
  name: string;
  code: string;
  type: 'folder' | 'subfolder';
  parentId?: string;
  multiplier: number;
  color?: string;
}

export interface DrawingSheet {
  id: string;
  title: string;
  subtitle: string;
  type: 'vector' | 'raster' | 'uploaded';
  url?: string;
  pdfData?: string | ArrayBuffer;
  scaleZones: ScaleZone[];
  defaultScale: string;
  hasRevisions?: boolean;
  revALabel: string;
  revBLabel?: string;
}
