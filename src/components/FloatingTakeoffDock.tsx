import React, { useState } from 'react';
import {
  MousePointer,
  Minus,
  Compass,
  Square,
  Maximize,
  Crosshair,
  Ruler,
  Folder,
  ChevronDown,
  Check,
  FolderPlus,
  Layers,
  Magnet,
  Search,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { FolderNode, ScaleZone, RecipeType } from '../types/takeoff';
import { CurrencyConfig } from '../utils/currency';

export interface QuickPreset {
  id: string;
  name: string;
  icon: string;
  category: 'length' | 'area' | 'count';
  tool: 'line' | 'polygon' | 'rectangle' | 'count';
  recipeType: RecipeType;
  unit: string;
  defaultRate: number; // in NGN / USD
  description: string;
  autoFormula: string;
}

export const QUICK_TRADE_PRESETS: QuickPreset[] = [
  // Length Presets
  {
    id: 'blockwork_225',
    name: '225mm Blockwork Wall',
    icon: '🧱',
    category: 'length',
    tool: 'line',
    recipeType: 'wall',
    unit: 'm²',
    defaultRate: 8500,
    description: '3.0m wall height, 225mm vibrated sandcrete blocks + mortar',
    autoFormula: 'Length × 3.0m height'
  },
  {
    id: 'concrete_trench',
    name: 'Foundation Trench',
    icon: '⛏️',
    category: 'length',
    tool: 'line',
    recipeType: 'trench',
    unit: 'm³',
    defaultRate: 14500,
    description: '0.6m wide × 0.85m deep strip foundation excavation & concrete',
    autoFormula: 'Length × 0.6m × 0.85m'
  },
  {
    id: 'skirting_board',
    name: 'Timber / Tile Skirting',
    icon: '📏',
    category: 'length',
    tool: 'line',
    recipeType: 'custom',
    unit: 'm',
    defaultRate: 3200,
    description: '100mm border perimeter skirting for finished walls',
    autoFormula: 'Linear run (m)'
  },

  // Area Presets
  {
    id: 'floor_screed_tile',
    name: 'Floor Screed & Porcelain Tile',
    icon: '🪵',
    category: 'area',
    tool: 'polygon',
    recipeType: 'floor',
    unit: 'm²',
    defaultRate: 12000,
    description: '50mm cement sand screed + 60×60 polished tiles (+10% waste)',
    autoFormula: 'Net Area + 10% cutting margin'
  },
  {
    id: 'rc_slab_150',
    name: '150mm R.C. Floor Slab',
    icon: '🏗️',
    category: 'area',
    tool: 'polygon',
    recipeType: 'floor',
    unit: 'm³',
    defaultRate: 65000,
    description: 'Reinforced concrete suspended slab (150mm thickness)',
    autoFormula: 'Area × 0.15m volume'
  },
  {
    id: 'pop_ceiling',
    name: 'P.O.P. False Ceiling',
    icon: '✨',
    category: 'area',
    tool: 'rectangle',
    recipeType: 'ceiling',
    unit: 'm²',
    defaultRate: 9800,
    description: 'Plaster of Paris ceiling boards with standard 0.35m bulkhead drops',
    autoFormula: 'Horizontal ceiling area'
  },

  // Count Presets
  {
    id: 'flush_door',
    name: 'Solid Wood Door (900×2100)',
    icon: '🚪',
    category: 'count',
    tool: 'count',
    recipeType: 'count',
    unit: 'Nr',
    defaultRate: 75000,
    description: 'Supply & fix complete with frame, hinges, and mortise lock',
    autoFormula: 'Unit count (Nr)'
  },
  {
    id: 'sanitary_wc',
    name: 'Water Closet (WC Suite)',
    icon: '🚽',
    category: 'count',
    tool: 'count',
    recipeType: 'count',
    unit: 'Nr',
    defaultRate: 92000,
    description: 'Ceramic dual-flush WC with cistern & soil pipe connection',
    autoFormula: 'Fixture count (Nr)'
  },
  {
    id: 'recessed_led',
    name: 'Recessed LED Downlight',
    icon: '💡',
    category: 'count',
    tool: 'count',
    recipeType: 'count',
    unit: 'Nr',
    defaultRate: 8500,
    description: '12W warm white circular ceiling downlight fixture',
    autoFormula: 'Lighting point (Nr)'
  }
];

interface FloatingTakeoffDockProps {
  activeTool: 'select' | 'line' | 'polygon' | 'rectangle' | 'void' | 'count' | 'calibrate';
  onSelectTool: (tool: 'select' | 'line' | 'polygon' | 'rectangle' | 'void' | 'count' | 'calibrate') => void;
  folders: FolderNode[];
  activeFolderId: string;
  onSelectFolder: (id: string) => void;
  onAddFolder: (name: string, multiplier: number) => void;
  scaleZone?: ScaleZone;
  onOpenScaleModal: () => void;
  isMagnetEnabled: boolean;
  onToggleMagnet: () => void;
  isMagnifierEnabled: boolean;
  onToggleMagnifier: () => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  measurementsCount: number;
  totalCost: number;
  selectedCurrency: CurrencyConfig;
  onOpenBoQ: () => void;
  onBackToSetup: () => void;
  onApplyPreset?: (preset: QuickPreset) => void;
}

export const FloatingTakeoffDock: React.FC<FloatingTakeoffDockProps> = ({
  activeTool,
  onSelectTool,
  folders,
  activeFolderId,
  onSelectFolder,
  onAddFolder,
  scaleZone,
  onOpenScaleModal,
  isMagnetEnabled,
  onToggleMagnet,
  isMagnifierEnabled,
  onToggleMagnifier,
  isDrawerOpen,
  onToggleDrawer,
  measurementsCount,
  totalCost,
  selectedCurrency,
  onOpenBoQ,
  onBackToSetup,
  onApplyPreset
}) => {
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [presetCategory, setPresetCategory] = useState<'all' | 'length' | 'area' | 'count'>('all');
  const [activePresetId, setActivePresetId] = useState<string | null>('floor_screed_tile');
  const [isAdvancedCADOpen, setIsAdvancedCADOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const activeFolder = folders.find(f => f.id === activeFolderId) || folders[0];
  const activePreset = QUICK_TRADE_PRESETS.find(p => p.id === activePresetId);

  // Helper for applying preset
  const handleSelectPreset = (preset: QuickPreset) => {
    setActivePresetId(preset.id);
    onSelectTool(preset.tool);
    if (onApplyPreset) {
      onApplyPreset(preset);
    }
    setIsPresetOpen(false);
  };

  const filteredPresets = presetCategory === 'all'
    ? QUICK_TRADE_PRESETS
    : QUICK_TRADE_PRESETS.filter(p => p.category === presetCategory);

  return (
    <>
      {/* Bottom Contextual Floating Dock (Wireframe Idea 1) */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-2 max-w-[98vw] sm:max-w-[96vw]">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl border border-slate-300 shadow-2xl text-slate-700">
          
          {/* Back to Setup */}
          <button
            onClick={onBackToSetup}
            title="Return to Setup & Calibration"
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-200 mx-0.5" />

          {/* Active Folder Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFolderOpen(!isFolderOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-xl hover:bg-slate-100 transition text-xs font-semibold text-slate-800 cursor-pointer"
              title="Change trade folder / location multiplier"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeFolder?.color || '#3b82f6' }}
              />
              <span className="max-w-[65px] sm:max-w-[110px] truncate font-bold text-slate-900">
                {activeFolder?.name || 'General'}
              </span>
              <span className="hidden sm:inline text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                x{activeFolder?.multiplier || 1}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isFolderOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsFolderOpen(false)}
                />
                <div className="absolute left-0 bottom-full mb-2 w-64 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in slide-in-from-bottom-2">
                  <div className="px-3 pb-2 mb-1 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Active Trade Folder</span>
                    <span className="text-slate-500 font-normal">Auto-syncs</span>
                  </div>

                  <div className="max-h-52 overflow-y-auto px-1 space-y-0.5">
                    {folders.map(f => {
                      const isAct = f.id === activeFolderId;
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            onSelectFolder(f.id);
                            setIsFolderOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                            isAct
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: f.color }}
                            />
                            <span className="truncate">{f.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                            <span>x{f.multiplier}</span>
                            {isAct && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Folder */}
                  <div className="px-2 pt-2 mt-1 border-t border-slate-100 flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Add sub-location/unit..."
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          onAddFolder(newFolderName.trim(), 1);
                          setNewFolderName('');
                        }
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        if (newFolderName.trim()) {
                          onAddFolder(newFolderName.trim(), 1);
                          setNewFolderName('');
                        }
                      }}
                      disabled={!newFolderName.trim()}
                      className="p-1 rounded-lg bg-blue-600 text-white disabled:opacity-40 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-0.5" />

          {/* ======================================================= */}
          {/* COMBINED CONCEPT 2 & 3: 3-VERB PRIMARY PALETTE + PRESETS */}
          {/* ======================================================= */}
          
          {/* Verb 0: Select */}
          <button
            onClick={() => onSelectTool('select')}
            title="Select & Move (V)"
            className={`p-2 rounded-xl transition cursor-pointer relative group ${
              activeTool === 'select'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MousePointer className="w-4 h-4" />
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block bg-slate-900 text-white text-[11px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg z-50">
              Select (V)
            </span>
          </button>

          {/* Verb 1: Length */}
          <button
            onClick={() => onSelectTool('line')}
            title="Measure Length (W) - Walls, Trenches, Pipes"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
              activeTool === 'line'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Minus className="w-4 h-4" />
            <span className="hidden sm:inline">Length</span>
          </button>

          {/* Verb 2: Area */}
          <button
            onClick={() => onSelectTool('polygon')}
            title="Measure Area (R) - Rooms, Slabs, Roofs"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
              activeTool === 'polygon' || activeTool === 'rectangle'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Area</span>
          </button>

          {/* Verb 3: Count */}
          <button
            onClick={() => onSelectTool('count')}
            title="Count Items (C) - Doors, Fittings, Fixtures"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
              activeTool === 'count'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span className="hidden sm:inline">Count</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 mx-0.5" />

          {/* Quick-Trade Presets Popover Toggle (Concept 3) */}
          <div className="relative">
            <button
              onClick={() => setIsPresetOpen(!isPresetOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isPresetOpen || activePreset
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="One-Click Construction Trade Presets (Auto-calculates standard heights & formulas)"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline font-bold">
                {activePreset ? activePreset.name.split(' ')[0] + ' Preset' : 'Quick Presets'}
              </span>
              <ChevronDown className="w-3 h-3 text-purple-500" />
            </button>

            {/* Presets Menu */}
            {isPresetOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsPresetOpen(false)}
                />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[calc(100vw-24px)] sm:w-96 max-h-[75vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-slate-900">Instant Trade Presets</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Zero formula math</span>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 mb-2.5 p-0.5 bg-slate-100 rounded-lg text-[11px]">
                    {(['all', 'length', 'area', 'count'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPresetCategory(cat)}
                        className={`flex-1 py-1 rounded-md capitalize font-medium transition cursor-pointer ${
                          presetCategory === cat
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Preset Items List */}
                  <div className="space-y-1.5 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                    {filteredPresets.map(preset => {
                      const isSelected = activePresetId === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50/50 shadow-xs ring-1 ring-purple-400'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <span className="text-sm">{preset.icon}</span>
                              <span>{preset.name}</span>
                            </div>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {selectedCurrency.symbol}{preset.defaultRate.toLocaleString()} / {preset.unit}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight mb-1.5">
                            {preset.description}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span className="font-mono text-purple-700 font-semibold">{preset.autoFormula}</span>
                            <span className="text-emerald-600 font-medium">Ready to trace →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-0.5" />

          {/* Void / Cutout Tool (Direct Deduction) */}
          <button
            onClick={() => onSelectTool('void')}
            title="Cut Out Opening / Window / Door Hole (-)"
            className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer relative group ${
              activeTool === 'void'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-rose-50 hover:text-rose-700'
            }`}
          >
            <Maximize className="w-4 h-4" />
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block bg-slate-900 text-white text-[11px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg z-50">
              Cutout Opening (-)
            </span>
          </button>

          {/* Snapping Magnet - desktop only in dock, available in top bar on mobile */}
          <button
            onClick={onToggleMagnet}
            title={isMagnetEnabled ? 'Corner Magnet Snap ON' : 'Corner Magnet Snap OFF'}
            className={`hidden md:flex p-2 rounded-xl transition cursor-pointer ${
              isMagnetEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            <Magnet className="w-4 h-4" />
          </button>

          {/* 2X Loupe Magnifier - desktop only in dock, available in top bar on mobile */}
          <button
            onClick={onToggleMagnifier}
            title={isMagnifierEnabled ? 'Magnifier Loupe ON' : 'Magnifier Loupe OFF'}
            className={`hidden md:flex p-2 rounded-xl transition cursor-pointer ${
              isMagnifierEnabled
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Scale Badge Button */}
          <button
            onClick={onOpenScaleModal}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-semibold transition cursor-pointer"
            title="Active Drawing Scale (Click to Change or Calibrate)"
          >
            <Ruler className="w-3 h-3 text-emerald-600" />
            <span>{scaleZone?.ratio || '1:100'}</span>
          </button>
        </div>

        {/* Floating Actions: Items Drawer & Jump to BoQ */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border border-slate-200 shadow-xl shrink-0">
          {/* Toggle Slide-Out Measurement Drawer */}
          <button
            onClick={onToggleDrawer}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isDrawerOpen
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Inspect items drawn on this plan"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Items</span>
            <span>({measurementsCount})</span>
          </button>

          {/* Next Step: BoQ */}
          <button
            onClick={onOpenBoQ}
            className="flex items-center gap-1 sm:gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer shrink-0"
            title="Open Live Bill of Quantities"
          >
            <span className="hidden sm:inline">BoQ</span>
            <span>{selectedCurrency.symbol}{Math.round(totalCost).toLocaleString()}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating HUD Status Pill (Linear / CAD style - positioned top right) */}
      <div className="absolute top-3 right-4 z-20 pointer-events-none hidden md:flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-mono px-3.5 py-1.5 rounded-full shadow-lg border border-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-sans">Folder:</span>
          <strong className="text-white">{activeFolder?.name}</strong>
          <span className="text-slate-400 font-mono">({activeFolder?.multiplier}x)</span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-300 font-sans">Preset:</span>
          <span className="text-purple-300 font-sans font-bold">{activePreset?.name || 'Standard'}</span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-300 font-sans">Scale:</span>
          <span className="text-emerald-300 font-bold">{scaleZone?.ratio || '1:100'}</span>
        </div>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-300 font-sans">Snap:</span>
          <span className={isMagnetEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
            {isMagnetEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    </>
  );
};
