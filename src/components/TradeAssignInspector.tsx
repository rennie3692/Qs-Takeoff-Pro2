import React, { useState } from 'react';
import {
  X,
  Search,
  Check,
  Sparkles,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { MeasurementItem, RecipeType } from '../types/takeoff';

interface TradeAssignInspectorProps {
  measurement: MeasurementItem | null;
  onClose: () => void;
  onUpdateTrade: (id: string, updates: Partial<MeasurementItem>) => void;
  position?: { x: number; y: number };
  folders?: any[];
  currencySymbol?: string;
  onOpenFullModal?: () => void;
}

const COMMON_TRADE_TAGS = [
  { label: 'Concrete Slab', recipeType: 'floor', depth: 0.15, unit: 'm³', color: '#0284c7' },
  { label: '225mm Blockwork', recipeType: 'wall', depth: 3.0, unit: 'm²', color: '#dc2626' },
  { label: 'Floor Screed', recipeType: 'floor', depth: 0.05, unit: 'm²', color: '#059669' },
  { label: 'Foundation Trench', recipeType: 'trench', depth: 0.85, unit: 'm³', color: '#ea580c' },
  { label: 'POP Ceiling', recipeType: 'ceiling', depth: 0.35, unit: 'm²', color: '#06b6d4' },
  { label: 'Door Void (-)', recipeType: 'count', depth: 2.1, unit: 'Nr', color: '#8E24AA' },
  { label: 'Sanitary Fixture', recipeType: 'count', depth: 0.0, unit: 'Nr', color: '#f59e0b' }
];

export const TradeAssignInspector: React.FC<TradeAssignInspectorProps> = ({
  measurement,
  onClose,
  onUpdateTrade,
  position,
  folders,
  currencySymbol = '$',
  onOpenFullModal
}) => {
  if (!measurement) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [currentDepth, setCurrentDepth] = useState<string>(() => {
    if (measurement.recipeType === 'wall') return String((measurement.recipeConfig as any)?.height || 2.8);
    if (measurement.recipeType === 'floor') return String((measurement.recipeConfig as any)?.thickness || 0.15);
    if (measurement.recipeType === 'trench') return String((measurement.recipeConfig as any)?.depth || 0.85);
    return '0.15';
  });

  const filteredTags = COMMON_TRADE_TAGS.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApplyTag = (tag: typeof COMMON_TRADE_TAGS[0]) => {
    let updatedConfig: any = { ...measurement.recipeConfig };
    if (tag.recipeType === 'wall') {
      updatedConfig = { ...updatedConfig, height: parseFloat(currentDepth) || 2.8, outputLinear: true, outputArea: true, outputVolume: true };
    } else if (tag.recipeType === 'floor') {
      updatedConfig = { ...updatedConfig, thickness: parseFloat(currentDepth) || 0.15, outputNetArea: true, outputSlabVolume: true };
    } else if (tag.recipeType === 'trench') {
      updatedConfig = { ...updatedConfig, depth: parseFloat(currentDepth) || 0.85, outputVolume: true, outputCenterline: true };
    }

    onUpdateTrade(measurement.id, {
      name: tag.label,
      recipeType: tag.recipeType as RecipeType,
      color: tag.color,
      recipeConfig: updatedConfig
    });
  };

  const handleDepthChange = (newVal: string) => {
    setCurrentDepth(newVal);
    const num = parseFloat(newVal);
    if (!isNaN(num) && num > 0) {
      let updatedConfig: any = { ...measurement.recipeConfig };
      if (measurement.recipeType === 'wall') {
        updatedConfig.height = num;
      } else if (measurement.recipeType === 'floor') {
        updatedConfig.thickness = num;
      } else if (measurement.recipeType === 'trench') {
        updatedConfig.depth = num;
      }
      onUpdateTrade(measurement.id, { recipeConfig: updatedConfig });
    }
  };

  return (
    <div
      className="absolute z-40 w-[320px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-300 p-3.5 text-xs text-slate-800 font-sans animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: position?.y ? Math.min(position.y, window.innerHeight - 320) : 100,
        right: position?.x ? Math.max(20, window.innerWidth - position.x - 340) : 24
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00796B]" />
          <span>Trade Assign Inspector</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Predictive Search Bar */}
      <div className="relative mb-2.5">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Predictive search trades..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00796B] focus:ring-1 focus:ring-[#00796B]"
        />
      </div>

      {/* Trade Tag Pills */}
      <div className="mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Trade Tag Pills
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {filteredTags.map(tag => {
            const isMatch = measurement.name.toLowerCase().includes(tag.label.toLowerCase());
            return (
              <button
                key={tag.label}
                onClick={() => handleApplyTag(tag)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  isMatch
                    ? 'bg-[#00796B] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{tag.label}</span>
                {isMatch && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Basic Inputs: Depth / Height & Unit */}
      <div className="pt-2 border-t border-slate-100">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Basic Inputs
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <span className="px-2 py-1.5 bg-slate-100 text-[11px] font-medium text-slate-500 border-r border-slate-200">
              Depth (m)
            </span>
            <input
              type="number"
              step="0.05"
              value={currentDepth}
              onChange={e => handleDepthChange(e.target.value)}
              className="w-full px-2 py-1 bg-transparent font-mono font-bold text-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
            <span className="text-slate-500">Active Recipe:</span>
            <span className="font-bold text-[#8E24AA] uppercase">{measurement.recipeType}</span>
          </div>
        </div>
      </div>

      {/* Done CTA */}
      <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-mono">
          ID: {measurement.id.slice(0, 10)}
        </span>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-[#333331] hover:bg-black text-white text-xs font-bold rounded-lg transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
