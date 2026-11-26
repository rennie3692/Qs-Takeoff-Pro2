import React from 'react';
import {
  FolderNode,
  MeasurementItem
} from '../types/takeoff';
import { CurrencyConfig } from '../utils/currency';
import {
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  Check,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';

interface LiveBoQDrawerProps {
  measurements: MeasurementItem[];
  folders: FolderNode[];
  currencySymbol?: string;
  selectedCurrency?: CurrencyConfig;
  totalCost: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenFullBoQ: () => void;
  onSelectMeasurement: (id: string) => void;
  selectedMeasurementId?: string | null;
  onEditMeasurement?: (item: MeasurementItem) => void;
}

export const LiveBoQDrawer: React.FC<LiveBoQDrawerProps> = ({
  measurements,
  folders,
  currencySymbol,
  selectedCurrency,
  totalCost,
  isExpanded,
  onToggleExpand,
  onOpenFullBoQ,
  onSelectMeasurement,
  selectedMeasurementId
}) => {
  // Take the most recent 6 measurements for the live drawer
  const recentMeasurements = [...measurements].reverse().slice(0, 8);
  const activeCurrencySymbol = currencySymbol || selectedCurrency?.symbol || '$';

  return (
    <div
      className="absolute bottom-4 right-4 z-30 transition-all duration-300 font-sans"
      style={{
        width: isExpanded ? '380px' : '290px'
      }}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col">
        {/* Header Strip */}
        <div
          onClick={onToggleExpand}
          className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
            <span className="text-xs font-bold tracking-tight">Live BOQ Drawer</span>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
              {measurements.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#4CAF50]">
              {activeCurrencySymbol}{Math.round(totalCost).toLocaleString()}
            </span>
            <button
              className="p-1 rounded-md text-slate-400 hover:text-white transition"
              title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsed / Expanded Content */}
        <div className="p-2.5">
          {recentMeasurements.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              No measurements traced yet. Trace walls, rooms, or count doors to populate.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-1.5 pl-1 w-6">✓</th>
                    <th className="pb-1.5">Trade</th>
                    <th className="pb-1.5 text-right">Depth/Ht</th>
                    <th className="pb-1.5 pr-1 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMeasurements.map((m) => {
                    const isSel = selectedMeasurementId === m.id;
                    const folder = folders.find(f => f.id === m.folderId);
                    
                    // Display height or depth
                    let depthOrHeight = '—';
                    if (m.recipeType === 'wall' && (m.recipeConfig as any)?.height) {
                      depthOrHeight = `${(m.recipeConfig as any).height}m`;
                    } else if (m.recipeType === 'floor' && (m.recipeConfig as any)?.thickness) {
                      depthOrHeight = `${(m.recipeConfig as any).thickness}m`;
                    } else if (m.recipeType === 'trench' && (m.recipeConfig as any)?.depth) {
                      depthOrHeight = `${(m.recipeConfig as any).depth}m`;
                    }

                    // Format value
                    let valLabel = '';
                    if (m.tool === 'count') {
                      valLabel = `${m.points.length} Nr`;
                    } else if (m.tool === 'line') {
                      valLabel = 'Line';
                    } else {
                      valLabel = 'Area';
                    }

                    return (
                      <tr
                        key={m.id}
                        onClick={() => onSelectMeasurement(m.id)}
                        className={`transition cursor-pointer ${
                          isSel
                            ? 'bg-blue-50/80 font-semibold text-blue-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="py-1.5 pl-1">
                          <Check className="w-3.5 h-3.5 text-[#4CAF50]" />
                        </td>
                        <td className="py-1.5 max-w-[110px] truncate">
                          <span className="block truncate font-medium text-slate-900" title={m.name}>
                            {m.name.replace('Takeoff', '').trim() || 'Shape'}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-mono text-[11px] text-slate-500">
                          {depthOrHeight}
                        </td>
                        <td className="py-1.5 pr-1 text-right font-mono text-[11px] font-bold text-[#00796B]">
                          {valLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Action Strip */}
          <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400">
              Audit formulas synced
            </span>
            <button
              onClick={onOpenFullBoQ}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Full BoQ & Rates →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
