import React, { useState, useMemo } from 'react';
import { CalculatedRow, MeasurementItem, FolderNode } from '../types/takeoff';
import { formatDim } from '../utils/geometry';
import { CurrencyConfig, SUPPORTED_CURRENCIES } from '../utils/currency';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Trash2,
  Edit3,
  Unlink,
  Link,
  Printer,
  ChevronDown,
  ChevronUp,
  Boxes,
  HelpCircle,
  Calculator,
  Eye,
  ArrowLeft,
  Crosshair,
  Coins
} from 'lucide-react';

interface MeasurementSheetProps {
  rows: CalculatedRow[];
  measurements: MeasurementItem[];
  folders: FolderNode[];
  selectedMeasurementId: string | null;
  onSelectMeasurement: (id: string | null) => void;
  onEditMeasurement: (measurementId: string) => void;
  onDeleteMeasurement: (measurementId: string) => void;
  onToggleUnlink: (measurementId: string) => void;
  onBackToPlan?: () => void;
  onViewOnPlan?: (measurementId: string) => void;
  currencySymbol?: string;
  currencyCode?: string;
  onCurrencyChange?: (curr: CurrencyConfig) => void;
}

export const MeasurementSheet: React.FC<MeasurementSheetProps> = ({
  rows,
  measurements,
  folders,
  selectedMeasurementId,
  onSelectMeasurement,
  onEditMeasurement,
  onDeleteMeasurement,
  onToggleUnlink,
  onBackToPlan,
  onViewOnPlan,
  currencySymbol = '$',
  currencyCode = 'USD',
  onCurrencyChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof CalculatedRow>('trade');
  const [sortAsc, setSortAsc] = useState(true);
  const [formulaModalRow, setFormulaModalRow] = useState<CalculatedRow | null>(null);

  // Filter & Sort rows
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch =
        row.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.folderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.formula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.trade.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTrade = selectedTrade === 'all' || row.trade === selectedTrade;
      return matchesSearch && matchesTrade;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      return sortAsc
        ? (Number(valA) || 0) - (Number(valB) || 0)
        : (Number(valB) || 0) - (Number(valA) || 0);
    });
  }, [rows, searchTerm, selectedTrade, sortField, sortAsc]);

  // Unique Trades
  const trades = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => set.add(r.trade));
    return Array.from(set);
  }, [rows]);

  // Aggregated Summary Totals
  const totals = useMemo(() => {
    let totalConcreteVol = 0;
    let totalWallArea = 0;
    let totalRoofSloped = 0;
    let totalCeilingArea = 0;
    let totalEstimatedCost = 0;

    rows.forEach(r => {
      totalEstimatedCost += r.totalCost || 0;
      if (r.unit === 'm³') {
        totalConcreteVol += r.factoredTotal;
      }
      if (r.unit === 'm²') {
        if (r.trade.includes('Roofing')) totalRoofSloped += r.factoredTotal;
        else if (r.trade.includes('Ceilings')) totalCeilingArea += r.factoredTotal;
        else if (r.trade.includes('Walls')) totalWallArea += r.factoredTotal;
      }
    });

    return {
      concreteVol: totalConcreteVol,
      wallArea: totalWallArea,
      roofSloped: totalRoofSloped,
      ceilingArea: totalCeilingArea,
      estimatedCost: totalEstimatedCost
    };
  }, [rows]);

  const handleSort = (field: keyof CalculatedRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Detailed Export Option B (Audit Trail with The Working)
  const exportDetailedOptionB = () => {
    const headers = [
      'Item Description',
      'Location / Folder',
      'Trade Classification',
      'Gross Quantity',
      'Deductions (Voids/Doors)',
      'Deduction Details',
      'Math Formula ("The Working")',
      'Net Total',
      'Unit',
      'Folder Multiplier',
      'Factored Total (After Multiplier)',
      `Unit Rate (${currencyCode})`,
      `Total Amount (${currencyCode})`,
      'Revision'
    ];

    const csvRows = [headers.join(',')];

    filteredRows.forEach(r => {
      const clean = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;
      csvRows.push([
        clean(r.itemName),
        clean(r.folderName),
        clean(r.trade),
        clean(formatDim(r.grossQty)),
        clean(formatDim(r.deductions)),
        clean(r.deductionNotes),
        clean(r.formula), // Exact QS Working Formula
        clean(formatDim(r.netTotal)),
        clean(r.unit),
        clean(r.isUnlinked ? '1 (Unlinked)' : r.folderMultiplier),
        clean(formatDim(r.factoredTotal)),
        clean(r.unitRate || 0),
        clean(formatDim(r.totalCost || 0)),
        clean(r.revision)
      ].join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `QS_Takeoff_Pro_Audit_Trail_OptionB_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] border-t border-slate-200 text-slate-800 select-none overflow-hidden font-sans">
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          {onBackToPlan && (
            <button
              onClick={onBackToPlan}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-blue-700 hover:text-blue-800 text-xs font-semibold shadow-xs transition border border-slate-300 mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Plan Drawing</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Material Quantities & Cost Estimates</span>
          </div>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono border border-slate-200">
            {filteredRows.length} items
          </span>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items, formulas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 w-44 shadow-xs"
            />
          </div>

          <select
            value={selectedTrade}
            onChange={e => setSelectedTrade(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
          >
            <option value="all">All Trades ({rows.length})</option>
            {trades.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Currency Selector */}
          {onCurrencyChange && (
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs shadow-xs">
              <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <select
                value={currencyCode}
                onChange={e => {
                  const found = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                  if (found) onCurrencyChange(found);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                title="Change project currency"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Option B: Detailed Working CSV */}
          <button
            onClick={exportDetailedOptionB}
            title="Export Option B: Detailed Audit Trail with full math formulas for clients/contractors"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Option B (Working Audit CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Takeoff Schedule"
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aggregate Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs shrink-0">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium">Foundation & Concrete</span>
          <span className="text-sm font-mono font-bold text-blue-700 mt-0.5">{formatDim(totals.concreteVol)} m³</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium">Walls & Brickwork</span>
          <span className="text-sm font-mono font-bold text-slate-900 mt-0.5">{formatDim(totals.wallArea)} m²</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium">Roof Surface (Sloped)</span>
          <span className="text-sm font-mono font-bold text-indigo-700 mt-0.5">{formatDim(totals.roofSloped)} m²</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium">Ceilings & Finishes</span>
          <span className="text-sm font-mono font-bold text-teal-700 mt-0.5">{formatDim(totals.ceilingArea)} m²</span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 shadow-xs flex flex-col col-span-2 sm:col-span-1">
          <span className="text-[11px] text-emerald-800 font-medium">Total Cost ({currencyCode})</span>
          <span className="text-sm font-mono font-bold text-emerald-700 mt-0.5">{currencySymbol}{formatDim(totals.estimatedCost)}</span>
        </div>
      </div>

      {/* Excel-Style Table Grid */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th
                onClick={() => handleSort('itemName')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  Item Measured
                  {sortField === 'itemName' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('folderName')}
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  Room / Location
                  {sortField === 'folderName' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('grossQty')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  Measured Size
                  {sortField === 'grossQty' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('deductions')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  Minus Cutouts
                  {sortField === 'deductions' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-2.5 px-3 min-w-[220px]">
                Calculation Steps ("The Working")
              </th>
              <th
                onClick={() => handleSort('netTotal')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  Net Amount
                  {sortField === 'netTotal' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-2.5 px-2 text-center w-12">Unit</th>
              <th className="py-2.5 px-2 text-center w-16">Repeat</th>
              <th
                onClick={() => handleSort('factoredTotal')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  Total Qty
                  {sortField === 'factoredTotal' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right w-24">Rate ({currencySymbol})</th>
              <th className="py-2.5 px-3 text-right w-28">Total ({currencySymbol})</th>
              <th className="py-2.5 px-2 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {filteredRows.map((row, idx) => {
              const isSelected = row.measurementId === selectedMeasurementId;
              const hasDeductions = row.deductions > 0;

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectMeasurement(row.measurementId)}
                  className={`cursor-pointer transition hover:bg-blue-50/40 ${
                    isSelected ? 'bg-blue-50 text-blue-950 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-center text-slate-400 font-sans text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-sans text-xs font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0 shadow-xs"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="font-semibold text-slate-900">{row.itemName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({row.trade.split('/')[0].trim()})
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-sans text-xs text-slate-700">
                    <div className="flex items-center gap-1">
                      <span>{row.folderName}</span>
                      {row.folderMultiplier > 1 && (
                        <span className="text-[10px] text-blue-700 bg-blue-50 px-1 rounded border border-blue-200 font-semibold">
                          x{row.folderMultiplier}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {formatDim(row.grossQty)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {hasDeductions ? (
                      <span
                        title={row.deductionNotes}
                        className="text-rose-600 bg-rose-50 px-1 rounded font-semibold border border-rose-200"
                      >
                        -{formatDim(row.deductions)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-xs text-blue-700 font-mono bg-slate-50/60">
                    <div className="flex items-center justify-between gap-1 group">
                      <span className="truncate max-w-[280px]" title={row.formula}>
                        {row.formula}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setFormulaModalRow(row);
                        }}
                        title="Inspect full audit formula"
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-blue-900 text-slate-400"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {formatDim(row.netTotal)}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-500 font-sans font-semibold">
                    {row.unit}
                  </td>
                  <td className="py-2 px-2 text-center font-sans">
                    {row.isUnlinked ? (
                      <span
                        title="Unlinked from folder multiplier"
                        className="text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold"
                      >
                        x1 (Unlinked)
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        x{row.folderMultiplier}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-700">
                    {formatDim(row.factoredTotal)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 font-mono">
                    {row.unitRate ? `${currencySymbol}${formatDim(row.unitRate, 2)}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                    {row.totalCost ? `${currencySymbol}${formatDim(row.totalCost, 2)}` : '—'}
                  </td>
                  <td className="py-2 px-2 text-center font-sans">
                    <div className="flex items-center justify-center gap-1">
                      {/* View on Plan */}
                      {onViewOnPlan && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onViewOnPlan(row.measurementId);
                          }}
                          title="View & Highlight on Plan Canvas"
                          className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Recipe */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onEditMeasurement(row.measurementId);
                        }}
                        title="Edit Hidden Dimensions & Recipe"
                        className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Multiplier Unlink Toggle */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onToggleUnlink(row.measurementId);
                        }}
                        title={row.isUnlinked ? 'Relink to Folder Multiplier' : 'Unlink from Multiplier'}
                        className={`p-1 rounded transition hover:bg-slate-100 ${
                          row.isUnlinked ? 'text-amber-600' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {row.isUnlinked ? <Unlink className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteMeasurement(row.measurementId);
                        }}
                        title="Delete Takeoff Item"
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={13} className="py-8 text-center text-slate-500 font-sans">
                  No takeoff measurements match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formula Inspection Modal */}
      {formulaModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                QS Audit Trail: The Working
              </h3>
              <button
                onClick={() => setFormulaModalRow(null)}
                className="text-slate-600 hover:text-slate-900 text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Item Description:</span>
                <span className="font-semibold text-slate-900">{formulaModalRow.itemName}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-emerald-800 break-words font-semibold">
                {formulaModalRow.formula}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">Gross Quantity:</span>
                  <span className="font-mono">{formatDim(formulaModalRow.grossQty)} {formulaModalRow.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Deductions:</span>
                  <span className="font-mono text-rose-600">-{formatDim(formulaModalRow.deductions)} {formulaModalRow.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Deduction Audit Notes:</span>
                  <span>{formulaModalRow.deductionNotes}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Net Calculated Total:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatDim(formulaModalRow.netTotal)} {formulaModalRow.unit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
