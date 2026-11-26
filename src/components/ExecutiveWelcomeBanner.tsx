import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Compass,
  Layers,
  Calculator,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Coins,
  Ruler,
  Maximize
} from 'lucide-react';
import { AppStage } from '../App';
import { CurrencyConfig } from '../utils/currency';

interface ExecutiveWelcomeBannerProps {
  currentStage: AppStage;
  onSelectStage: (stage: AppStage) => void;
  selectedCurrency: CurrencyConfig;
  totalMeasurements: number;
  totalProjectCost: number;
  onDismiss: () => void;
}

export const ExecutiveWelcomeBanner: React.FC<ExecutiveWelcomeBannerProps> = ({
  currentStage,
  onSelectStage,
  selectedCurrency,
  totalMeasurements,
  totalProjectCost,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700 shadow-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        {/* Compact Bar / Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold tracking-wide uppercase text-blue-400">
                  Executive Briefing
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-medium">
                  Quantity Surveying & Takeoff Pro v2.4
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Audit-Compliant Formulas
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium truncate">
                Interactive commercial estimating suite: calibrated blueprint takeoff to live Bill of Quantities (BoQ).
              </p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Tender Estimate:</span>
                <strong className="text-emerald-400 font-mono">
                  {selectedCurrency.symbol}{Math.round(totalProjectCost).toLocaleString()} {selectedCurrency.code}
                </strong>
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Live Items:</span>
                <strong className="text-blue-300 font-mono">{totalMeasurements}</strong>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
              title={isExpanded ? 'Collapse Executive Overview' : 'Expand Executive Overview'}
            >
              <span>{isExpanded ? 'Hide Details' : 'Explore Features'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Feature Guide Cards for Executives */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-3 pb-1"
            >
              <div className="border-t border-slate-800 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Card 1: Setup & Calibration */}
                  <div
                    onClick={() => onSelectStage('setup')}
                    className={`group relative p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      currentStage === 'setup'
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm shadow-emerald-950'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Compass className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white">
                          Stage 1: Setup & Scale
                        </span>
                      </div>
                      {currentStage === 'setup' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                          Active Stage
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                      Calibrate architectural plan scales (e.g. 1:100 or 2-point vector ruler), upload multi-page PDF sets, and configure repeat floor multipliers.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-emerald-400" /> Auto-Ratio
                      </span>
                      <span>•</span>
                      <span>Multi-Story Multipliers</span>
                    </div>
                  </div>

                  {/* Card 2: Takeoff Canvas */}
                  <div
                    onClick={() => onSelectStage('takeoff')}
                    className={`group relative p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      currentStage === 'takeoff'
                        ? 'bg-blue-950/40 border-blue-500/50 shadow-sm shadow-blue-950'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white">
                          Stage 2: Takeoff Canvas
                        </span>
                      </div>
                      {currentStage === 'takeoff' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                          Active Stage
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                      Draw walls, slabs, trenches, and doors with sub-millimeter precision. Subtract door & window openings directly using negative cutout tools.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Maximize className="w-3 h-3 text-blue-400" /> Void Cutouts (-)
                      </span>
                      <span>•</span>
                      <span>Magnet Snap & Magnifier</span>
                    </div>
                  </div>

                  {/* Card 3: BoQ & Cost Summary */}
                  <div
                    onClick={() => onSelectStage('boq')}
                    className={`group relative p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      currentStage === 'boq'
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-sm shadow-purple-950'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                          <Calculator className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white">
                          Stage 3: Bill of Quantities
                        </span>
                      </div>
                      {currentStage === 'boq' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                          Active Stage
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                      Audit complete QS formulas (&quot;The Working&quot;) with gross vs. net subtractions, unit rates, and instant CSV export across 12 global currencies.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-400" /> 12 Currencies
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-purple-400" /> CSV Export
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Tips for Executives */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Getting Started:</strong> Click on any stage card above or switch via the top navigation bar to explore live data.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Need to reload sample demo?</span>
                    <button
                      onClick={() => onSelectStage('setup')}
                      className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                    >
                      View Setup & Plans →
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
