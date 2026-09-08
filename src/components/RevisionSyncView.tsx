import React, { useState } from 'react';
import { DrawingSheet, MeasurementItem, ScaleZone, FolderNode } from '../types/takeoff';
import { formatDim, polygonAreaMeters, lineLengthMeters } from '../utils/geometry';
import {
  GitCompare,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Move,
  X,
  Layers,
  Sparkles,
  Sliders,
  AlertCircle
} from 'lucide-react';

interface RevisionSyncViewProps {
  sheet: DrawingSheet;
  measurementsRevA: MeasurementItem[];
  measurementsRevB: MeasurementItem[];
  scaleZones: ScaleZone[];
  folders: FolderNode[];
  onSyncAllToRevB: () => void;
  onUpdateMeasurement: (id: string, updates: Partial<MeasurementItem>) => void;
  onClose: () => void;
}

export const RevisionSyncView: React.FC<RevisionSyncViewProps> = ({
  sheet,
  measurementsRevA,
  measurementsRevB,
  scaleZones,
  folders,
  onSyncAllToRevB,
  onUpdateMeasurement,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'side_by_side' | 'audit_diff'>('side_by_side');
  const [selectedSyncId, setSelectedSyncId] = useState<string | null>(null);

  const scale = scaleZones[0];
  const pxPerM = scale ? scale.pixelsPerMeter : 40;

  // Compare quantities for linked measurements by UID
  const comparisonList = measurementsRevA.map(mA => {
    // Find matching Rev B measurement with same UID or syncLinkedId
    const mB = measurementsRevB.find(b => b.uid === mA.uid || b.syncLinkedId === mA.id);
    const qtyA =
      mA.tool === 'line'
        ? lineLengthMeters(mA.points, pxPerM)
        : mA.tool === 'count'
        ? mA.points.length
        : polygonAreaMeters(mA.points, pxPerM);

    const qtyB = mB
      ? mB.tool === 'line'
        ? lineLengthMeters(mB.points, pxPerM)
        : mB.tool === 'count'
        ? mB.points.length
        : polygonAreaMeters(mB.points, pxPerM)
      : null;

    const delta = qtyB !== null ? qtyB - qtyA : null;
    const unit = mA.tool === 'line' ? 'm' : mA.tool === 'count' ? 'nr' : 'm²';

    return {
      itemA: mA,
      itemB: mB,
      qtyA,
      qtyB,
      delta,
      unit,
      isSynced: !!mB
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="h-14 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              Revision Sync & Geometry Re-alignment Engine
            </h1>
            <p className="text-xs text-slate-400">
              Compare Revision A vs Revision B with linked Unique ID (UID) tracking
            </p>
          </div>
        </div>

        {/* Sync Action & Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('side_by_side')}
              className={`px-3 py-1 rounded transition ${
                activeTab === 'side_by_side' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side Drawing Sync
            </button>
            <button
              onClick={() => setActiveTab('audit_diff')}
              className={`px-3 py-1 rounded transition ${
                activeTab === 'audit_diff' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Revision Quantity Delta Audit
            </button>
          </div>

          <button
            onClick={onSyncAllToRevB}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Rev A Geometry to Rev B</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'side_by_side' ? (
        <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800 overflow-hidden">
          {/* Left: Revision A */}
          <div className="flex flex-col h-full bg-slate-900/40">
            <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-400">
                ORIGINAL: {sheet.revALabel}
              </span>
              <span className="font-mono text-slate-400">
                {measurementsRevA.length} Takeoffs
              </span>
            </div>

            <div className="flex-1 relative overflow-hidden bg-slate-950 p-4 flex items-center justify-center">
              <svg className="w-full h-full max-h-[600px] border border-slate-800 rounded bg-slate-900" viewBox="0 0 1000 650">
                {/* Standard Rev A walls */}
                <path
                  d="M 120 140 L 680 140 L 680 380 L 420 380 L 420 560 L 120 560 Z"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="8"
                />
                <line x1="420" y1="140" x2="420" y2="380" stroke="#94a3b8" strokeWidth="6" />

                {/* Rev A Measurements */}
                {measurementsRevA.map(m => (
                  <g key={m.id}>
                    {m.tool === 'polygon' && (
                      <polygon
                        points={m.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill={m.color}
                        fillOpacity="0.3"
                        stroke={m.color}
                        strokeWidth="2"
                      />
                    )}
                    {m.tool === 'line' && (
                      <polyline
                        points={m.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={m.color}
                        strokeWidth="3"
                      />
                    )}
                  </g>
                ))}
                <text x="500" y="50" fill="#38bdf8" fontSize="16" fontWeight="bold" textAnchor="middle">
                  REVISION A BASELINE (Tender)
                </text>
              </svg>
            </div>
          </div>

          {/* Right: Revision B */}
          <div className="flex flex-col h-full bg-slate-900/40">
            <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-400">
                NEW REVISION: {sheet.revBLabel}
              </span>
              <span className="font-mono text-emerald-400">
                {measurementsRevB.length} Synced Takeoffs
              </span>
            </div>

            <div className="flex-1 relative overflow-hidden bg-slate-950 p-4 flex items-center justify-center">
              <svg className="w-full h-full max-h-[600px] border border-slate-800 rounded bg-slate-900" viewBox="0 0 1000 650">
                {/* Rev B walls with Bedroom extended (+1.2m at x=728) */}
                <path
                  d="M 120 140 L 728 140 L 728 380 L 420 380 L 420 560 L 120 560 Z"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="8"
                />
                <line x1="420" y1="140" x2="420" y2="380" stroke="#94a3b8" strokeWidth="6" />

                {/* Rev B Measurements (Draggable vertices) */}
                {measurementsRevB.map(m => (
                  <g key={m.id}>
                    {m.tool === 'polygon' && (
                      <polygon
                        points={m.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill={m.color}
                        fillOpacity="0.4"
                        stroke="#fbbf24"
                        strokeWidth="2.5"
                      />
                    )}
                    {m.tool === 'line' && (
                      <polyline
                        points={m.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="3.5"
                      />
                    )}
                    {/* Vertices indicator */}
                    {m.points.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#fbbf24"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        className="cursor-move"
                      />
                    ))}
                  </g>
                ))}

                {/* Rev B Extension Callout */}
                <rect x="680" y="140" width="48" height="240" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" />
                <text x="704" y="260" fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">
                  +1.2m WALL SHIFT
                </text>

                <text x="500" y="50" fill="#fbbf24" fontSize="16" fontWeight="bold" textAnchor="middle">
                  REVISION B (Drag Vertices to Match Shifted Wall)
                </text>
              </svg>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Delta View */
        <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Revision Quantity Variance & Audit Breakdown
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Unique ID (UID) Linked Comparison
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-800/80 text-slate-300 text-[11px] uppercase border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Takeoff Description</th>
                  <th className="py-3 px-4">Unique ID (UID)</th>
                  <th className="py-3 px-4 text-right">Rev A Baseline</th>
                  <th className="py-3 px-4 text-right">Rev B Current</th>
                  <th className="py-3 px-4 text-right">Variance (Delta)</th>
                  <th className="py-3 px-4 text-center">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {comparisonList.map((item, idx) => {
                  const hasVariance = item.delta !== null && Math.abs(item.delta) > 0.01;
                  const isPositive = item.delta !== null && item.delta > 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                        {item.itemA.name}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                        {item.itemA.uid}
                      </td>
                      <td className="py-2.5 px-4 text-right text-blue-400 font-semibold">
                        {formatDim(item.qtyA)} {item.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right text-amber-400 font-semibold">
                        {item.qtyB !== null ? `${formatDim(item.qtyB)} ${item.unit}` : 'Not Synced'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {item.delta !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              hasVariance
                                ? isPositive
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-red-950 text-red-400 border border-red-800'
                                : 'text-slate-500'
                            }`}
                          >
                            {isPositive ? `+${formatDim(item.delta)}` : formatDim(item.delta)} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        {item.isSynced ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
