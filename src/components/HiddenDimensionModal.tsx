import React, { useState, useEffect } from 'react';
import {
  MeasurementItem,
  RecipeType,
  WallRecipeConfig,
  TrenchRecipeConfig,
  RoofRecipeConfig,
  CeilingRecipeConfig,
  FloorRecipeConfig,
  CountRecipeConfig,
  FolderNode,
  ScaleZone,
  EdgeTag
} from '../types/takeoff';
import {
  lineLengthMeters,
  polygonAreaMeters,
  polygonPerimeterMeters,
  getRoofPitchFactor,
  formatDim
} from '../utils/geometry';
import {
  Sliders,
  CheckSquare,
  Square,
  Compass,
  Layers,
  ChevronRight,
  Info,
  Ruler,
  Boxes,
  HelpCircle,
  Tag
} from 'lucide-react';

interface HiddenDimensionModalProps {
  isOpen: boolean;
  measurement: MeasurementItem | null;
  folders: FolderNode[];
  scaleZones: ScaleZone[];
  onSave: (updatedMeasurement: MeasurementItem) => void;
  onCancel: () => void;
}

export const HiddenDimensionModal: React.FC<HiddenDimensionModalProps> = ({
  isOpen,
  measurement,
  folders,
  scaleZones,
  onSave,
  onCancel
}) => {
  if (!isOpen || !measurement) return null;

  const [name, setName] = useState(measurement.name);
  const [folderId, setFolderId] = useState(measurement.folderId);
  const [recipeType, setRecipeType] = useState<RecipeType>(measurement.recipeType);
  const [isUnlinked, setIsUnlinked] = useState(measurement.isUnlinkedMultiplier);
  const [edgeTags, setEdgeTags] = useState<Record<number, EdgeTag>>(measurement.edgeTags || {});

  // Local recipe configs
  const [wallConfig, setWallConfig] = useState<WallRecipeConfig>(() => ({
    height: 2.8,
    thickness: 0.23,
    outputLinear: true,
    outputArea: true,
    outputVolume: true,
    outputFormwork: false,
    ...((measurement.recipeType === 'wall' ? measurement.recipeConfig : {}) as any)
  }));

  const [trenchConfig, setTrenchConfig] = useState<TrenchRecipeConfig>(() => ({
    centerLineWidth: 0.6,
    depth: 0.85,
    outputCenterline: true,
    outputVolume: true,
    outputBeddingArea: true,
    outputShoring: true,
    ...((measurement.recipeType === 'trench' ? measurement.recipeConfig : {}) as any)
  }));

  const [roofConfig, setRoofConfig] = useState<RoofRecipeConfig>(() => ({
    pitchDegrees: 30,
    outputPlanArea: true,
    outputSlopedArea: true,
    outputRidge: true,
    outputValley: true,
    outputEave: true,
    outputHip: true,
    outputRake: true,
    ...((measurement.recipeType === 'roof' ? measurement.recipeConfig : {}) as any)
  }));

  const [ceilingConfig, setCeilingConfig] = useState<CeilingRecipeConfig>(() => ({
    bulkheadDrop: 0.35,
    outputCeilingArea: true,
    outputBulkheadTotal: true,
    outputCornice: true,
    ...((measurement.recipeType === 'ceiling' ? measurement.recipeConfig : {}) as any)
  }));

  const [floorConfig, setFloorConfig] = useState<FloorRecipeConfig>(() => ({
    thickness: 0.15,
    outputNetArea: true,
    outputPerimeter: true,
    outputSkirting: true,
    autoDeductDoors: true,
    defaultDoorWidth: 0.9,
    outputSlabVolume: true,
    ...((measurement.recipeType === 'floor' ? measurement.recipeConfig : {}) as any)
  }));

  const [countConfig, setCountConfig] = useState<CountRecipeConfig>(() => ({
    itemType: 'Door D-01 (900mm)',
    width: 0.9,
    unitRate: 250,
    ...((measurement.recipeType === 'count' ? measurement.recipeConfig : {}) as any)
  }));

  // Find scale info
  const sz = scaleZones.find(z => z.id === measurement.scaleZoneId) || scaleZones[0];
  const pxPerM = sz ? sz.pixelsPerMeter : 40;

  // Geometry dimensions in 2D
  const measuredLength = lineLengthMeters(measurement.points, pxPerM);
  const measuredArea = polygonAreaMeters(measurement.points, pxPerM);
  const measuredPerimeter = polygonPerimeterMeters(measurement.points, pxPerM);

  // Active folder multiplier
  const currentFolder = folders.find(f => f.id === folderId);
  const folderMultiplier = currentFolder ? currentFolder.multiplier : 1;

  const handleSave = () => {
    let finalConfig: any = {};
    if (recipeType === 'wall') finalConfig = wallConfig;
    else if (recipeType === 'trench') finalConfig = trenchConfig;
    else if (recipeType === 'roof') finalConfig = roofConfig;
    else if (recipeType === 'ceiling') finalConfig = ceilingConfig;
    else if (recipeType === 'floor') finalConfig = floorConfig;
    else if (recipeType === 'count') finalConfig = countConfig;

    onSave({
      ...measurement,
      name,
      folderId,
      recipeType,
      recipeConfig: finalConfig,
      isUnlinkedMultiplier: isUnlinked,
      edgeTags,
      hiddenDimensionsPrompted: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Room & Construction Details
              </h2>
              <p className="text-xs text-slate-500">
                Enter height, depth, or thickness to automatically calculate materials and costs
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 block mb-1">
              Step 2 of 2
            </span>
            <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {measurement.tool.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-800 flex-1">
          {/* Measured 2D Geometry Summary Card */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                2D Measured Dimension
              </span>
              <span className="text-base font-mono font-bold text-blue-700">
                {measurement.tool === 'line'
                  ? `${formatDim(measuredLength)} m`
                  : measurement.tool === 'count'
                  ? `${measurement.points.length} Points`
                  : `${formatDim(measuredArea)} m²`}
              </span>
            </div>
            {measurement.tool !== 'line' && measurement.tool !== 'count' && (
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Perimeter (2D)
                </span>
                <span className="text-base font-mono font-bold text-slate-900">
                  {formatDim(measuredPerimeter)} m
                </span>
              </div>
            )}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Scale Calibration
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {sz?.ratio} ({sz?.pixelsPerMeter} px/m)
              </span>
            </div>
          </div>

          {/* Item Name & Target Folder */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item Description / Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-medium shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Location Folder (Hierarchy)
              </label>
              <select
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.type === 'subfolder' ? `  ↳ ${f.name}` : f.name} (x{f.multiplier})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipe Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Construction Recipe Template
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'wall', label: 'Wall & Cavity', icon: Boxes, desc: 'Height, thk, area, vol' },
                { id: 'trench', label: 'Trench Excavation', icon: Ruler, desc: 'Center-line offset & depth' },
                { id: 'roof', label: 'Roofing & Slope', icon: Compass, desc: 'Pitch angle & edge tags' },
                { id: 'ceiling', label: 'Ceilings & Drop', icon: Layers, desc: 'Bulkhead & auto-cornice' },
                { id: 'floor', label: 'Floor & Skirting', icon: CheckSquare, desc: 'Auto-voids & doors' },
                { id: 'count', label: 'Count Fitting', icon: Sliders, desc: 'Doors, columns, sanitary' }
              ].map(r => {
                const Icon = r.icon;
                const active = recipeType === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRecipeType(r.id as RecipeType)}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="font-bold block text-xs leading-tight">{r.label}</span>
                      <span className="text-[10px] text-slate-500">{r.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============================================================ */}
          {/* A. WALL RECIPE INPUTS                                        */}
          {/* ============================================================ */}
          {recipeType === 'wall' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-blue-600" />
                Wall Volumetric Hidden Dimensions
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Wall Height (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={wallConfig.height}
                    onChange={e => setWallConfig({ ...wallConfig, height: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                  />
                  <span className="text-[11px] text-slate-500">e.g. 2.80m ceiling height</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Wall Thickness (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={wallConfig.thickness}
                    onChange={e => setWallConfig({ ...wallConfig, thickness: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                  />
                  <span className="text-[11px] text-slate-500">e.g. 0.23m (230mm brick)</span>
                </div>
              </div>

              {/* Recipe Output Checkboxes */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Output Columns to Measurement Sheet:
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={wallConfig.outputLinear}
                      onChange={e => setWallConfig({ ...wallConfig, outputLinear: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Linear Length (m) — <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{formatDim(measuredLength)}m</code></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={wallConfig.outputArea}
                      onChange={e => setWallConfig({ ...wallConfig, outputArea: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Vertical Wall Area (m²) — Formula: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Length * Height</code> ({formatDim(measuredLength * wallConfig.height)}m²)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={wallConfig.outputVolume}
                      onChange={e => setWallConfig({ ...wallConfig, outputVolume: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Wall Volume (m³) — Formula: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Length * Height * Thickness</code> ({formatDim(measuredLength * wallConfig.height * wallConfig.thickness)}m³)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={wallConfig.outputFormwork}
                      onChange={e => setWallConfig({ ...wallConfig, outputFormwork: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Wall Formwork (2 faces) — Formula: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">2 * Length * Height</code> ({formatDim(2 * measuredLength * wallConfig.height)}m²)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* A2. TRENCH EXCAVATION (Center-line Tool)                     */}
          {/* ============================================================ */}
          {recipeType === 'trench' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-amber-600" />
                Substructure Center-line Trench Excavation
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Center-line Expansion Width (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={trenchConfig.centerLineWidth}
                    onChange={e => setTrenchConfig({ ...trenchConfig, centerLineWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                  />
                  <span className="text-[11px] text-slate-500">e.g. 0.60m (600mm trench)</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Trench Depth (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={trenchConfig.depth}
                    onChange={e => setTrenchConfig({ ...trenchConfig, depth: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                  />
                  <span className="text-[11px] text-slate-500">e.g. 0.85m depth</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Output Columns to Measurement Sheet:
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={trenchConfig.outputVolume}
                      onChange={e => setTrenchConfig({ ...trenchConfig, outputVolume: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Trench Excavation (m³) — <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Length * Width * Depth</code> ({formatDim(measuredLength * trenchConfig.centerLineWidth * trenchConfig.depth)}m³)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={trenchConfig.outputBeddingArea}
                      onChange={e => setTrenchConfig({ ...trenchConfig, outputBeddingArea: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Trench Bottom Bedding Area (m²) — <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Length * Width</code> ({formatDim(measuredLength * trenchConfig.centerLineWidth)}m²)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={trenchConfig.outputShoring}
                      onChange={e => setTrenchConfig({ ...trenchConfig, outputShoring: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Earthwork Shoring (m²) — <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">2 * Length * Depth</code> ({formatDim(2 * measuredLength * trenchConfig.depth)}m²)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* B. ROOFING RECIPE (Pitch Factor & Edge Tagging)             */}
          {/* ============================================================ */}
          {recipeType === 'roof' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-600" />
                Roofing Slope & Pitch Factor Calculation
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Roof Pitch Angle (Degrees)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="85"
                      value={roofConfig.pitchDegrees}
                      onChange={e => setRoofConfig({ ...roofConfig, pitchDegrees: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                    />
                    <span className="text-sm font-semibold text-slate-700">°</span>
                  </div>
                  <span className="text-[11px] text-slate-500">e.g. 30° pitch (~7:12 ratio)</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Calculated Pitch Factor</span>
                  {(() => {
                    const { factor } = getRoofPitchFactor(roofConfig.pitchDegrees);
                    const sloped = measuredArea * factor;
                    return (
                      <div>
                        <span className="text-base font-mono font-bold text-indigo-600">
                          {formatDim(factor, 4)}x
                        </span>
                        <p className="text-[11px] text-slate-600 mt-1">
                          True Sloped Area: <code className="bg-slate-50 px-1 py-0.5 rounded">{formatDim(measuredArea)}m² / cos({roofConfig.pitchDegrees}°) = {formatDim(sloped)}m²</code>
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Edge Tagging Guide */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1 mb-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Edge Tagging for Ridge, Valley, & Eaves:
                </span>
                <p className="text-xs text-indigo-800">
                  On the canvas, click the circular letter badge on any roof polygon edge to tag it as <strong>R</strong>idge, <strong>V</strong>alley, <strong>E</strong>ave, or <strong>H</strong>ip to automatically generate flashing and gutter quantities.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={roofConfig.outputSlopedArea}
                    onChange={e => setRoofConfig({ ...roofConfig, outputSlopedArea: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Output True Sloped Area (m²) [Plan / cos(pitch)]</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={roofConfig.outputRidge}
                    onChange={e => setRoofConfig({ ...roofConfig, outputRidge: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Output Ridge Capping from Tagged Edges</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={roofConfig.outputValley}
                    onChange={e => setRoofConfig({ ...roofConfig, outputValley: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Output Valley Gutter from Tagged Edges</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={roofConfig.outputEave}
                    onChange={e => setRoofConfig({ ...roofConfig, outputEave: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Output Eaves Gutters & Fascias</span>
                </label>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* C. CEILINGS & FINISHES (Vertical Drop Bulkhead, Auto-Cornice)*/}
          {/* ============================================================ */}
          {recipeType === 'ceiling' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                Ceiling Bulkhead & Cornice Recipe
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bulkhead Vertical Drop (m)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={ceilingConfig.bulkheadDrop}
                  onChange={e => setCeilingConfig({ ...ceilingConfig, bulkheadDrop: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                />
                <span className="text-[11px] text-slate-500">
                  Formula: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Ceiling Area + (Perimeter * Drop Height)</code>
                </span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={ceilingConfig.outputBulkheadTotal}
                    onChange={e => setCeilingConfig({ ...ceilingConfig, outputBulkheadTotal: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Calculated Total Ceiling Area with Bulkheads ({formatDim(measuredArea + measuredPerimeter * ceilingConfig.bulkheadDrop)}m²)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={ceilingConfig.outputCornice}
                    onChange={e => setCeilingConfig({ ...ceilingConfig, outputCornice: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Auto-Cornice from Room Perimeter ({formatDim(measuredPerimeter)}m)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* D. FLOORING & SKIRTING (Auto-Voids & Door Deductions)        */}
          {/* ============================================================ */}
          {recipeType === 'floor' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Flooring, Voids, & Method 2 Door Deductions
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Slab Thickness (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={floorConfig.thickness}
                    onChange={e => setFloorConfig({ ...floorConfig, thickness: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                  />
                  <span className="text-[11px] text-slate-500">e.g. 0.15m (150mm slab)</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Default Door Width (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={floorConfig.defaultDoorWidth}
                    onChange={e => setFloorConfig({ ...floorConfig, defaultDoorWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                  />
                  <span className="text-[11px] text-slate-500">For Method 2 door skirting deduction</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={floorConfig.outputNetArea}
                    onChange={e => setFloorConfig({ ...floorConfig, outputNetArea: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Net Floor Finish Area (Auto-deducts internal voids)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={floorConfig.outputSkirting}
                    onChange={e => setFloorConfig({ ...floorConfig, outputSkirting: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Method 2 Skirting: Automatically subtract <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Door Width * Count</code>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={floorConfig.outputSlabVolume}
                    onChange={e => setFloorConfig({ ...floorConfig, outputSlabVolume: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Concrete Slab Volume (Net Area * Thickness)</span>
                </label>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* E. COUNT RECIPE                                              */}
          {/* ============================================================ */}
          {recipeType === 'count' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                Count Item Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Component Type
                  </label>
                  <input
                    type="text"
                    value={countConfig.itemType}
                    onChange={e => setCountConfig({ ...countConfig, itemType: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                    placeholder="e.g. Door D-01 (900mm)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Opening Width (m) [for Method 2 Deduction]
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={countConfig.width || 0.9}
                    onChange={e => setCountConfig({ ...countConfig, width: parseFloat(e.target.value) || 0.9 })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Folder Multiplier Linking / Unlinking */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Typical Unit Multiplier Linking
              </span>
              <span className="text-[11px] text-slate-500">
                Room repeat count is <strong>x{folderMultiplier}</strong>. Unlink if this item does not repeat.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsUnlinked(!isUnlinked)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border shadow-xs ${
                isUnlinked
                  ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {isUnlinked ? 'Un-linked (Factor = x1)' : `Linked (Factor = x${folderMultiplier})`}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1.5"
          >
            Save & Add to Calculation Sheet
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
