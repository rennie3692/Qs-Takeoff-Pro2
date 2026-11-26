import React, { useRef } from 'react';
import {
  DrawingSheet,
  FolderNode,
  MeasurementItem,
  RecipeType,
  ScaleZone
} from '../types/takeoff';
import { CurrencyConfig, SUPPORTED_CURRENCIES } from '../utils/currency';
import { FolderManager } from './FolderManager';
import {
  FileText,
  Upload,
  Compass,
  Ruler,
  DollarSign,
  ArrowRight,
  Layers,
  Check,
  Sparkles,
  ChevronRight,
  FolderTree,
  FileCheck2,
  FileSpreadsheet
} from 'lucide-react';

interface SetupCalibrationViewProps {
  sheets: DrawingSheet[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  scaleZones: ScaleZone[];
  currentScale?: ScaleZone;
  onOpenScaleModal: () => void;
  onTriggerCalibration: () => void;
  onApplyScale: (ratio: string, pixelsPerMeter: number) => void;
  folders: FolderNode[];
  measurements: MeasurementItem[];
  activeFolderId: string;
  onSelectFolder: (id: string) => void;
  onAddFolder: (name: string, multiplier: number, parentId?: string) => void;
  onUpdateFolderMultiplier: (folderId: string, multiplier: number) => void;
  onDeleteFolder: (folderId: string) => void;
  onQuickRecipeSelect: (recipeType: RecipeType) => void;
  activeRecipeType: RecipeType;
  selectedCurrency: CurrencyConfig;
  onSelectCurrency: (currency: CurrencyConfig) => void;
  onProceedToTakeoff: () => void;
  onOpenBoQ: () => void;
}

const SCALE_PRESETS = [
  { ratio: '1:20', px: 120, label: '1:20 Detail' },
  { ratio: '1:50', px: 80, label: '1:50 Layout' },
  { ratio: '1:100', px: 40, label: '1:100 Standard Floor' },
  { ratio: '1:200', px: 20, label: '1:200 Overall Plan' },
  { ratio: '1:500', px: 8, label: '1:500 Site Plan' }
];

export const SetupCalibrationView: React.FC<SetupCalibrationViewProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onFileUpload,
  scaleZones,
  currentScale,
  onOpenScaleModal,
  onTriggerCalibration,
  onApplyScale,
  folders,
  measurements,
  activeFolderId,
  onSelectFolder,
  onAddFolder,
  onUpdateFolderMultiplier,
  onDeleteFolder,
  onQuickRecipeSelect,
  activeRecipeType,
  selectedCurrency,
  onSelectCurrency,
  onProceedToTakeoff,
  onOpenBoQ
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
  const activeScaleZone = (activeSheet.scaleZones || scaleZones)[0] || currentScale;
  const activeRatio = activeScaleZone?.ratio || '1:100';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 lg:p-8 space-y-6">
      {/* Stage Introduction Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
              Stage 1 of 3
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Setup & Plan Calibration
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Project Setup & Scale Calibration
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Configure your active blueprint sheet, verify the architectural scale, customize project currency,
            and organize trade folders with floor multipliers before beginning your takeoff.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 shrink-0">
          {measurements.length > 0 && (
            <button
              onClick={onOpenBoQ}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-2 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>BoQ ({measurements.length})</span>
            </button>
          )}
          <button
            onClick={onProceedToTakeoff}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Proceed to Canvas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Setup Options, Right Folder & WBS Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sheet, Scale & Currency (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Blueprint Sheet Selection */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Active Blueprint Sheet
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Select an architectural drawing or import custom drawings
                  </p>
                </div>
              </div>

              {/* Upload New Blueprint Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileUpload}
                  accept=".pdf,image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition flex items-center gap-1.5 border border-blue-200 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload PDF / Plan</span>
                </button>
              </div>
            </div>

            {/* Sheet Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sheets.map(sheet => {
                const isAct = sheet.id === activeSheetId;
                const sheetScale = sheet.scaleZones?.[0]?.ratio || sheet.defaultScale || '1:100';
                return (
                  <div
                    key={sheet.id}
                    onClick={() => onSelectSheet(sheet.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isAct
                        ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {sheet.title}
                        </span>
                        {isAct && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                        {sheet.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                      <span>Scale: {sheetScale}</span>
                      <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {sheet.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Drawing Scale & Ruler Calibration */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Drawing Scale & Calibration
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Ensure all length and area calculations match the physical drawing
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenScaleModal}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition shadow-2xs"
              >
                Advanced Settings
              </button>
            </div>

            {/* Current Active Scale Summary Pill */}
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 block">
                  Current Scale on {activeSheet.title}:
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-mono font-bold text-emerald-900">
                    {activeRatio}
                  </span>
                  <span className="text-xs font-mono text-emerald-700">
                    ({activeScaleZone?.pixelsPerMeter || 40} pixels = 1.0 meter)
                  </span>
                </div>
              </div>

              {/* Visual Scale Bar */}
              <div className="hidden sm:flex flex-col items-end gap-1 font-mono text-[10px] text-emerald-800">
                <span className="text-[9px] uppercase tracking-wider text-emerald-600">
                  1.0m visual bar
                </span>
                <div className="flex items-center gap-1 font-semibold">
                  <span>0m</span>
                  <div
                    className="h-2.5 bg-emerald-600 rounded-xs border border-emerald-700"
                    style={{
                      width: Math.min(100, Math.max(20, activeScaleZone?.pixelsPerMeter || 40))
                    }}
                  />
                  <span>1m</span>
                </div>
              </div>
            </div>

            {/* Quick Architectural Presets */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Quick Architectural Presets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SCALE_PRESETS.map(preset => {
                  const isCur =
                    activeRatio === preset.ratio ||
                    activeScaleZone?.pixelsPerMeter === preset.px;
                  return (
                    <button
                      key={preset.ratio}
                      type="button"
                      onClick={() => onApplyScale(preset.ratio, preset.px)}
                      className={`p-2 rounded-xl border text-left transition text-xs flex flex-col justify-between ${
                        isCur
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{preset.ratio}</span>
                        {isCur && <Check className="w-3 h-3 text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2-Point Manual Calibration Option */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Interactive 2-Point Calibration
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Click two known points directly on the plan (e.g. a 5.0m grid line or dimension text)
                </span>
              </div>
              <button
                onClick={onTriggerCalibration}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Calibrate on Plan</span>
              </button>
            </div>
          </div>

          {/* Card 3: Project Currency Settings */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Project Currency & Pricing Format
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Select the currency symbol applied to unit rates, totals, and export sheets
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {selectedCurrency.label}
                </span>
              </div>
            </div>

            {/* Currency Selector Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUPPORTED_CURRENCIES.map(curr => {
                const isSelected = curr.code === selectedCurrency.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => onSelectCurrency(curr)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{curr.code}</span>
                      <span className="text-[10px] text-slate-500 truncate">{curr.name}</span>
                    </div>
                    <span className="text-sm font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                      {curr.symbol}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Pricing Preview Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
              <span>Sample BoQ Rate Display:</span>
              <span className="font-mono font-bold text-slate-900">
                120.0 m² @ {selectedCurrency.symbol}45.00/m² ={' '}
                <span className="text-emerald-700">
                  {selectedCurrency.symbol}5,400.00
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Work Breakdown Structure / Folders (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Trade Folders & Multipliers
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Organize elements into trades & apply floor multipliers
                  </p>
                </div>
              </div>
            </div>

            {/* Embedded Interactive Folder Manager */}
            <div className="flex-1 overflow-y-auto max-h-[560px]">
              <FolderManager
                folders={folders}
                measurements={measurements}
                scaleZones={scaleZones}
                activeFolderId={activeFolderId}
                onSelectFolder={onSelectFolder}
                onAddFolder={onAddFolder}
                onUpdateFolderMultiplier={onUpdateFolderMultiplier}
                onDeleteFolder={onDeleteFolder}
                onQuickRecipeSelect={onQuickRecipeSelect}
                activeRecipeType={activeRecipeType}
                onTriggerCalibration={onTriggerCalibration}
                onOpenScaleModal={onOpenScaleModal}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Primary Completion Action */}
      <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Setup Ready</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                Sheet: {activeSheet.title}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                Scale: {activeRatio}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-amber-400 font-semibold">
                Currency: {selectedCurrency.code} ({selectedCurrency.symbol})
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Ready to take off measurements with complete distraction-free full-canvas view
            </span>
          </div>
        </div>

        <button
          onClick={onProceedToTakeoff}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <span>Start Measuring on Plan (Stage 2)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
