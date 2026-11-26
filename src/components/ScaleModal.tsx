import React, { useState } from 'react';
import {
  X,
  Compass,
  Ruler,
  Check,
  Layers,
  Sliders,
  Info,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { ScaleZone } from '../types/takeoff';

interface ScalePreset {
  ratio: string;
  pixelsPerMeter: number;
  label: string;
  category: string;
  description: string;
}

const STANDARD_PRESETS: ScalePreset[] = [
  {
    ratio: '1:20',
    pixelsPerMeter: 120,
    label: '1:20 Detail Callout',
    category: 'Details',
    description: 'Enlarged sections, joinery, and stair details'
  },
  {
    ratio: '1:50',
    pixelsPerMeter: 80,
    label: '1:50 Enlarged Layout',
    category: 'Rooms & Bathrooms',
    description: 'Kitchen, bathroom, and plant room layouts'
  },
  {
    ratio: '1:100',
    pixelsPerMeter: 40,
    label: '1:100 Standard Floor Plan',
    category: 'Architectural GA',
    description: 'Most common scale for residential & commercial general arrangement plans'
  },
  {
    ratio: '1:200',
    pixelsPerMeter: 20,
    label: '1:200 Overall Plan / Roof',
    category: 'Overview',
    description: 'Large commercial floorplates and roof drainage plans'
  },
  {
    ratio: '1:500',
    pixelsPerMeter: 8,
    label: '1:500 Site Plan',
    category: 'Civil & Site',
    description: 'Site layout, boundaries, external works, and utilities'
  }
];

interface ScaleModalProps {
  isOpen: boolean;
  currentScale?: ScaleZone;
  sheetTitle: string;
  onClose: () => void;
  onApplyScale: (ratio: string, pixelsPerMeter: number) => void;
  onStartTwoPointCalibration: () => void;
}

export const ScaleModal: React.FC<ScaleModalProps> = ({
  isOpen,
  currentScale,
  sheetTitle,
  onClose,
  onApplyScale,
  onStartTwoPointCalibration
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customRatioDenom, setCustomRatioDenom] = useState<string>('100');
  const [customPxPerM, setCustomPxPerM] = useState<string>(
    currentScale ? currentScale.pixelsPerMeter.toString() : '40'
  );

  const activeRatio = currentScale?.ratio || '1:100';
  const activePxPerM = currentScale?.pixelsPerMeter || 40;

  const handleSelectPreset = (preset: ScalePreset) => {
    onApplyScale(preset.ratio, preset.pixelsPerMeter);
    onClose();
  };

  const handleApplyCustomRatio = () => {
    const denom = parseFloat(customRatioDenom);
    if (!isNaN(denom) && denom > 0) {
      // Standard base vector canvas conversion formula: 4000 / denominator
      const computedPx = Math.max(1, Math.round((4000 / denom) * 10) / 10);
      onApplyScale(`1:${denom}`, computedPx);
      onClose();
    }
  };

  const handleApplyCustomPx = () => {
    const px = parseFloat(customPxPerM);
    if (!isNaN(px) && px > 0) {
      const approxRatio = `1:${Math.round(4000 / px)}`;
      onApplyScale(approxRatio, px);
      onClose();
    }
  };

  return (
    <div
      id="scale-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="scale-modal-content"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Drawing Scale Settings
              </h2>
              <p className="text-xs text-slate-500">
                Plan: <strong className="text-slate-700">{sheetTitle}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Scale Banner */}
        <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Active Scale: <strong className="font-mono font-bold">{activeRatio}</strong>
              <span className="text-emerald-700 ml-1.5 font-mono">
                ({activePxPerM} pixels = 1.0 meter)
              </span>
            </span>
          </div>

          {/* Visual Scale Bar Preview */}
          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-emerald-800 font-semibold">
            <span>0m</span>
            <div
              className="h-2 bg-emerald-700 rounded-sm border border-emerald-800"
              style={{ width: Math.min(100, Math.max(20, activePxPerM)) }}
              title={`1.0m = ${activePxPerM}px`}
            />
            <span>1m</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-3 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 transition relative ${
              activeTab === 'presets'
                ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Standard Architectural Presets
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 transition relative ${
              activeTab === 'custom'
                ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Custom Ratio or Density
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'presets' ? (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500 mb-1">
                Select standard scale printed on the plan title block:
              </p>
              {STANDARD_PRESETS.map(preset => {
                const isCurrent =
                  activeRatio === preset.ratio || activePxPerM === preset.pixelsPerMeter;
                return (
                  <div
                    key={preset.ratio}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {preset.ratio}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">
                          {preset.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          {preset.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{preset.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-500">
                        {preset.pixelsPerMeter} px/m
                      </span>
                      {isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Option A: Custom Ratio */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Option A: Enter Architectural Ratio
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700 font-mono">1 :</span>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={customRatioDenom}
                    onChange={e => setCustomRatioDenom(e.target.value)}
                    placeholder="100"
                    className="w-32 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomRatio}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                  >
                    Apply 1:{customRatioDenom}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Calculates density based on standard blueprint export dimensions (e.g. 1:75, 1:125, 1:250).
                </p>
              </div>

              {/* Option B: Direct Pixel Density */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Option B: Enter Exact Pixels per Meter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="1000"
                    value={customPxPerM}
                    onChange={e => setCustomPxPerM(e.target.value)}
                    placeholder="40.0"
                    className="w-32 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">px / meter</span>
                  <button
                    type="button"
                    onClick={handleApplyCustomPx}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                  >
                    Set Density
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Best for scanned raster blueprints or custom CAD exports with known DPI.
                </p>
              </div>
            </div>
          )}

          {/* 2-Point Manual Calibration Section */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Ruler className="w-4 h-4 text-emerald-700" />
                  <span>Interactive 2-Point Plan Ruler Calibration</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed max-w-sm">
                  Click two known points on the drawing (like a 5.0m grid line or dimension text) to calibrate directly from the blueprint.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartTwoPointCalibration();
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                <span>Calibrate on Plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Changing scale updates all existing and future calculations instantly</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
