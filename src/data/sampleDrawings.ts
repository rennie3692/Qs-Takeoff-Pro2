import { DrawingSheet, FolderNode, MeasurementItem, ScaleZone } from '../types/takeoff';

export const INITIAL_SCALE_ZONES: ScaleZone[] = [
  {
    id: 'sz_main_1_100',
    name: 'Main Plan Scale (1:100)',
    ratio: '1:100',
    pixelsPerMeter: 40, // 40px = 1 meter
    bounds: { x: 40, y: 40, width: 920, height: 620 },
    isDefault: true
  },
  {
    id: 'sz_detail_1_20',
    name: 'Detail Callout A (1:20)',
    ratio: '1:20',
    pixelsPerMeter: 120, // 120px = 1 meter (3x larger zoom for detail)
    bounds: { x: 740, y: 420, width: 220, height: 220 },
    isDefault: false
  }
];

export const INITIAL_FOLDERS: FolderNode[] = [
  {
    id: 'f_unit_101',
    name: 'Typical 2-Bed Unit (Block A)',
    code: 'UNIT-101',
    type: 'folder',
    multiplier: 10, // x10 Typical Apartments
    color: '#2563eb'
  },
  {
    id: 'sf_living',
    name: 'Living & Dining Room',
    code: 'RM-101',
    type: 'subfolder',
    parentId: 'f_unit_101',
    multiplier: 10,
    color: '#0284c7'
  },
  {
    id: 'sf_master_bed',
    name: 'Master Bedroom',
    code: 'RM-102',
    type: 'subfolder',
    parentId: 'f_unit_101',
    multiplier: 10,
    color: '#0d9488'
  },
  {
    id: 'f_substructure',
    name: 'Substructure & Groundworks',
    code: 'SUB-01',
    type: 'folder',
    multiplier: 1,
    color: '#ea580c'
  },
  {
    id: 'f_roofing',
    name: 'Roof Structure & Rainwater',
    code: 'ROOF-01',
    type: 'folder',
    multiplier: 1,
    color: '#7c3aed'
  }
];

export const SAMPLE_SHEETS: DrawingSheet[] = [
  {
    id: 'sheet_arch_gf',
    title: 'Architectural Ground Floor Plan',
    subtitle: 'Drawing A-101 • General Arrangement',
    type: 'vector',
    scaleZones: INITIAL_SCALE_ZONES,
    defaultScale: '1:100',
    hasRevisions: true,
    revALabel: 'Rev A (Tender Issue)',
    revBLabel: 'Rev B (Construction Issue - Bedroom Extended)'
  },
  {
    id: 'sheet_foundation',
    title: 'Foundation & Substructure Trenches',
    subtitle: 'Drawing S-001 • Strip Footings & Ground Beams',
    type: 'vector',
    scaleZones: [
      {
        id: 'sz_found_1_100',
        name: 'Foundation Plan (1:100)',
        ratio: '1:100',
        pixelsPerMeter: 40,
        isDefault: true
      }
    ],
    defaultScale: '1:100',
    hasRevisions: false,
    revALabel: 'Rev A'
  },
  {
    id: 'sheet_roof',
    title: 'Roof Geometry & Pitched Truss Plan',
    subtitle: 'Drawing A-301 • Hip & Valley 30° Pitch',
    type: 'vector',
    scaleZones: [
      {
        id: 'sz_roof_1_100',
        name: 'Roof Layout (1:100)',
        ratio: '1:100',
        pixelsPerMeter: 40,
        isDefault: true
      }
    ],
    defaultScale: '1:100',
    hasRevisions: false,
    revALabel: 'Rev A'
  }
];

export const INITIAL_MEASUREMENTS: MeasurementItem[] = [
  // 1. Living & Dining Floor with auto-void cutout
  {
    id: 'm_living_floor',
    uid: 'uid-living-floor-001',
    name: 'Living & Dining Floor Area',
    folderId: 'sf_living',
    tool: 'polygon',
    points: [
      { x: 120, y: 140 },
      { x: 420, y: 140 },
      { x: 420, y: 380 },
      { x: 120, y: 380 }
    ],
    color: '#0ea5e9',
    scaleZoneId: 'sz_main_1_100',
    recipeType: 'floor',
    recipeConfig: {
      thickness: 0.15,
      outputNetArea: true,
      outputPerimeter: true,
      outputSkirting: true,
      autoDeductDoors: true,
      defaultDoorWidth: 0.9,
      outputSlabVolume: true
    },
    hiddenDimensionsPrompted: true,
    isUnlinkedMultiplier: false,
    revision: 'RevA',
    timestamp: Date.now() - 3600000
  },
  // 2. Staircase Void inside Living Room (Auto-Void deduction demonstration)
  {
    id: 'm_living_stair_void',
    uid: 'uid-stair-void-002',
    name: 'Stair Opening Void',
    folderId: 'sf_living',
    tool: 'void',
    isVoid: true,
    points: [
      { x: 160, y: 280 },
      { x: 260, y: 280 },
      { x: 260, y: 340 },
      { x: 160, y: 340 }
    ],
    color: '#ec4899',
    scaleZoneId: 'sz_main_1_100',
    recipeType: 'floor',
    recipeConfig: {
      thickness: 0,
      outputNetArea: false,
      outputPerimeter: false,
      outputSkirting: false,
      autoDeductDoors: false,
      defaultDoorWidth: 0.9,
      outputSlabVolume: false
    },
    hiddenDimensionsPrompted: true,
    isUnlinkedMultiplier: false,
    revision: 'RevA',
    timestamp: Date.now() - 3500000
  },
  // 3. Living Room Doors (Method 2 Door Deduction for skirting)
  {
    id: 'm_living_doors',
    uid: 'uid-door-003',
    name: 'Balcony & Entry Doors',
    folderId: 'sf_living',
    tool: 'count',
    points: [
      { x: 420, y: 220 },
      { x: 120, y: 240 }
    ],
    color: '#f59e0b',
    scaleZoneId: 'sz_main_1_100',
    recipeType: 'count',
    recipeConfig: {
      itemType: 'Door D-01 (900mm)',
      width: 0.9,
      unitRate: 350
    },
    hiddenDimensionsPrompted: true,
    isUnlinkedMultiplier: false,
    revision: 'RevA',
    timestamp: Date.now() - 3400000
  },
  // 4. Living Room Bulkhead Ceiling (Vertical Drop logic)
  {
    id: 'm_living_ceiling',
    uid: 'uid-ceiling-004',
    name: 'Acoustic Ceiling with Bulkhead',
    folderId: 'sf_living',
    tool: 'polygon',
    points: [
      { x: 120, y: 140 },
      { x: 420, y: 140 },
      { x: 420, y: 380 },
      { x: 120, y: 380 }
    ],
    color: '#06b6d4',
    scaleZoneId: 'sz_main_1_100',
    recipeType: 'ceiling',
    recipeConfig: {
      bulkheadDrop: 0.35, // 350mm drop
      outputCeilingArea: true,
      outputBulkheadTotal: true,
      outputCornice: true
    },
    hiddenDimensionsPrompted: true,
    isUnlinkedMultiplier: false,
    revision: 'RevA',
    timestamp: Date.now() - 3300000
  },
  // 5. External Brickwork Walls
  {
    id: 'm_ext_wall_north',
    uid: 'uid-wall-005',
    name: 'External Cavity Wall (North)',
    folderId: 'sf_living',
    tool: 'line',
    points: [
      { x: 120, y: 140 },
      { x: 420, y: 140 },
      { x: 680, y: 140 }
    ],
    color: '#dc2626',
    scaleZoneId: 'sz_main_1_100',
    recipeType: 'wall',
    recipeConfig: {
      height: 2.8,
      thickness: 0.28,
      outputLinear: true,
      outputArea: true,
      outputVolume: true,
      outputFormwork: false
    },
    hiddenDimensionsPrompted: true,
    isUnlinkedMultiplier: false,
    revision: 'RevA',
    timestamp: Date.now() - 3200000
  },
  // 6. Substructure Foundation Trench (Center-line Tool)
  {
    id: 'm_trench_main',
    uid: 'uid-trench-006',
    name: 'Continuous Strip Footing Trench',
    folderId: 'f_substructure',
    tool: 'line',
    points: [
      { x: 100, y: 120 },
      { x: 700, y: 120 },
      { x: 700, y: 460 },
      { x: 100, y: 460 }
    ],
    color: '#ea580c',
    scaleZoneId: 'sz_main_1_100',
    recipeType: 'trench',
    recipeConfig: {
      centerLineWidth: 0.6, // 600mm width
      depth: 0.9,           // 900mm depth
      outputCenterline: true,
      outputVolume: true,
      outputBeddingArea: true,
      outputShoring: true
    },
    hiddenDimensionsPrompted: true,
    isUnlinkedMultiplier: false,
    revision: 'RevA',
    timestamp: Date.now() - 3100000
  },
  // 7. Roof Hip & Valley (30° Pitch Factor with tagged edges)
  {
    id: 'm_roof_main',
    uid: 'uid-roof-007',
    name: 'Main Pitched Roof Slope (North)',
    folderId: 'f_roofing',
    tool: 'polygon',
    points: [
      { x: 120, y: 140 },
      { x: 420, y: 140 },
      { x: 380, y: 260 },
      { x: 160, y: 260 }
    ],
    color: '#8b5cf6',
    scaleZoneId: 'sz_main_1_100',
    recipeType: 'roof',
    recipeConfig: {
      pitchDegrees: 30, // 30° pitch
      outputPlanArea: true,
      outputSlopedArea: true,
      outputRidge: true,
      outputValley: true,
      outputEave: true,
      outputHip: true,
      outputRake: true
    },
    edgeTags: {
      0: 'ridge',
      1: 'hip',
      2: 'eave',
      3: 'hip'
    },
    hiddenDimensionsPrompted: true,
    isUnlinkedMultiplier: false,
    revision: 'RevA',
    timestamp: Date.now() - 3000000
  }
];
