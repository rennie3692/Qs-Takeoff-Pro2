import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Compass,
  Layers,
  Calculator,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Coins,
  Ruler,
  Maximize,
  FolderTree
} from 'lucide-react';
import { AppStage } from '../App';
import { CurrencyConfig } from '../utils/currency';

interface ExecutiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: AppStage;
  onSelectStage: (stage: AppStage) => void;
  selectedCurrency: CurrencyConfig;
  totalMeasurements: number;
  totalProjectCost: number;
}

export const ExecutiveTourModal: React.FC<ExecutiveTourModalProps> = ({
  isOpen,
  onClose,
  currentStage,
  onSelectStage,
  selectedCurrency,
  totalMeasurements,
  totalProjectCost
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5 border-b border-slate-700 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Executive Briefing
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">
                    Quantity Surveying & Takeoff Pro v2.4
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Audit-Compliant Formulas
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Commercial Estimating & Blueprint Takeoff Dashboard
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  A high-precision quantity surveying suite bridging architectural blueprints, vector calibration, subtractive opening deductions, and live Bill of Quantities.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 ml-4"
              title="Close Executive Briefing"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Real-Time Metrics Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Live Tender Cost:</span>
                <span className="text-base font-mono font-bold text-emerald-700">
                  {selectedCurrency.symbol}{Math.round(totalProjectCost).toLocaleString()} {selectedCurrency.code}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Active Measurements:</span>
                <span className="text-sm font-mono font-bold text-blue-700">{totalMeasurements}</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Currency:</span>
                <span className="font-semibold text-slate-800">{selectedCurrency.label}</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              All quantities reflect live 3D wall heights and repeat floor multipliers.
            </span>
          </div>

          {/* 3-Stage Interactive Roadmap Cards */}
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Any Stage to Jump Directly Into The Workflow:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stage 1: Setup & Calibration */}
              <div
                onClick={() => {
                  onSelectStage('setup');
                  onClose();
                }}
                className={`group p-4 rounded-xl border text-left transition cursor-pointer ${
                  currentStage === 'setup'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Compass className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      1. Setup & Scale
                    </h3>
                  </div>
                  {currentStage === 'setup' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                      Current
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Set architectural drawing scales (e.g. 1:100 or 2-point vector calibration ruler), upload multipage PDF plans, and set multi-story repeat multipliers.
                </p>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <Ruler className="w-3.5 h-3.5" /> Vector Scale
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FolderTree className="w-3.5 h-3.5" /> Multipliers
                  </span>
                </div>
              </div>

              {/* Stage 2: Takeoff Canvas */}
              <div
                onClick={() => {
                  onSelectStage('takeoff');
                  onClose();
                }}
                className={`group p-4 rounded-xl border text-left transition cursor-pointer ${
                  currentStage === 'takeoff'
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      2. Takeoff Canvas
                    </h3>
                  </div>
                  {currentStage === 'takeoff' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                      Current
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Edge-to-edge drawing workspace with floating controls. Measure walls, slabs, trenches, and count items. Directly cut out window/door opening voids (-).
                </p>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                    <Maximize className="w-3.5 h-3.5" /> Void Deductions (-)
                  </span>
                  <span>Floating Dock</span>
                </div>
              </div>

              {/* Stage 3: Bill of Quantities */}
              <div
                onClick={() => {
                  onSelectStage('boq');
                  onClose();
                }}
                className={`group p-4 rounded-xl border text-left transition cursor-pointer ${
                  currentStage === 'boq'
                    ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Bill of Quantities
                    </h3>
                  </div>
                  {currentStage === 'boq' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold">
                      Current
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Transparent QS audit formulas (&quot;The Working&quot;) showing gross dimensions, opening subtractions, net quantities, unit rates, and instant CSV export.
                </p>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-purple-700">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Full Audit Trail
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" /> Multi-Currency
                  </span>
                </div>
              </div>
            </div>

            {/* Value Highlights */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Key Commercial Advantages For Decision Makers:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Zero Subcontractor Disputes:</strong> Every line and void has an exact mathematical audit trail.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Global Ready:</strong> 12 international currencies including Nigerian Naira (₦), USD ($), EUR (€), and GBP (£).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Zero Clutter UI:</strong> Maximize visual screen space on laptops and external monitors.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Click anytime on <strong className="text-slate-700 font-semibold">Executive Guide</strong> in the top header to reopen this tour.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Start Exploring Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
