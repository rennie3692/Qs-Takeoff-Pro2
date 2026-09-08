import React, { useState, useMemo } from 'react';
import { CalculatedRow, MeasurementItem, FolderNode } from '../types/takeoff';
import { formatDim } from '../utils/geometry';
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
  Eye
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
}

export const MeasurementSheet: React.FC<MeasurementSheetProps> = ({
  rows,
  measurements,
  folders,
  selectedMeasurementId,
  onSelectMeasurement,
  onEditMeasurement,
  onDeleteMeasurement,
  onToggleUnlink
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
      'Unit Rate ($)',
      'Total Amount ($)',
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
    <div className="w-full h-full flex flex-col bg-slate-900 border-t border-slate-700 text-slate-200 select-none overflow-hidden font-sans">
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Measurement Sheet (Live Audit Grid)</span>
          </div>
          <span className="text-xs bg-slate-950 px-2 py-0.5 rounded text-slate-400 font-mono border border-slate-700">
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
              className="bg-slate-950 border border-slate-700 rounded-md pl-8 pr-3 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
            />
          </div>

          <select
            value={selectedTrade}
            onChange={e => setSelectedTrade(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Trades ({rows.length})</option>
            {trades.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Export Option B: Detailed Working CSV */}
          <button
            onClick={exportDetailedOptionB}
            title="Export Option B: Detailed Audit Trail with full math formulas for clients/contractors"
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Option B (Working Audit CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Takeoff Schedule"
            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Ribbon */}
      <div className="grid grid-cols-5 gap-2 px-4 py-1.5 bg-slate-950/70 border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Excavation & Conc:</span>
          <span className="font-mono font-bold text-amber-400">{formatDim(totals.concreteVol)} m³</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Wall Net Area:</span>
          <span className="font-mono font-bold text-sky-400">{formatDim(totals.wallArea)} m²</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Roof True Sloped:</span>
          <span className="font-mono font-bold text-purple-400">{formatDim(totals.roofSloped)} m²</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Ceilings & Drop:</span>
          <span className="font-mono font-bold text-cyan-400">{formatDim(totals.ceilingArea)} m²</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 font-mono">
          <span className="text-slate-500">Bill Total (Est):</span>
          <span className="font-bold text-emerald-400">${formatDim(totals.estimatedCost)}</span>
        </div>
      </div>

      {/* Excel-Style Table Grid */}
      <div className="flex-1 overflow-auto bg-slate-950">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            <tr>
              <th className="py-2 px-3 w-10 text-center">#</th>
              <th
                onClick={() => handleSort('itemName')}
                className="py-2 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  Item Description
                  {sortField === 'itemName' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('folderName')}
                className="py-2 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  Location / Folder
                  {sortField === 'folderName' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('grossQty')}
                className="py-2 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  Gross Qty
                  {sortField === 'grossQty' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('deductions')}
                className="py-2 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  Deductions (Voids/Doors)
                  {sortField === 'deductions' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-2 px-3 min-w-[220px]">
                Math Formula ("The Working")
              </th>
              <th
                onClick={() => handleSort('netTotal')}
                className="py-2 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  Net Total
                  {sortField === 'netTotal' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-2 px-2 text-center w-12">Unit</th>
              <th className="py-2 px-2 text-center w-16">Factor</th>
              <th
                onClick={() => handleSort('factoredTotal')}
                className="py-2 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  Factored Qty
                  {sortField === 'factoredTotal' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-2 px-3 text-right w-20">Rate ($)</th>
              <th className="py-2 px-3 text-right w-24">Amount ($)</th>
              <th className="py-2 px-2 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 font-mono">
            {filteredRows.map((row, idx) => {
              const isSelected = row.measurementId === selectedMeasurementId;
              const hasDeductions = row.deductions > 0;

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectMeasurement(row.measurementId)}
                  className={`cursor-pointer transition hover:bg-slate-800/60 ${
                    isSelected ? 'bg-amber-500/15 border-l-4 border-amber-500' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-center text-slate-500 font-sans text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-sans text-xs font-medium text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span>{row.itemName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({row.trade.split('/')[0].trim()})
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-sans text-xs text-slate-300">
                    <div className="flex items-center gap-1">
                      <span>{row.folderName}</span>
                      {row.folderMultiplier > 1 && (
                        <span className="text-[10px] text-blue-400 bg-blue-950 px-1 rounded">
                          x{row.folderMultiplier}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">
                    {formatDim(row.grossQty)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {hasDeductions ? (
                      <span
                        title={row.deductionNotes}
                        className="text-red-400 bg-red-950/40 px-1 rounded font-semibold"
                      >
                        -{formatDim(row.deductions)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-xs text-sky-300 font-mono bg-slate-900/40">
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
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white text-slate-400"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-amber-300">
                    {formatDim(row.netTotal)}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 font-sans font-semibold">
                    {row.unit}
                  </td>
                  <td className="py-2 px-2 text-center font-sans">
                    {row.isUnlinked ? (
                      <span
                        title="Unlinked from folder multiplier"
                        className="text-[10px] px-1 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800"
                      >
                        x1 (Unlinked)
                      </span>
                    ) : (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                        x{row.folderMultiplier}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-400">
                    {formatDim(row.factoredTotal)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">
                    ${row.unitRate ? formatDim(row.unitRate, 2) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-200">
                    ${row.totalCost ? formatDim(row.totalCost, 2) : '—'}
                  </td>
                  <td className="py-2 px-2 text-center font-sans">
                    <div className="flex items-center justify-center gap-1">
                      {/* Edit Recipe */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onEditMeasurement(row.measurementId);
                        }}
                        title="Edit Hidden Dimensions & Recipe"
                        className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800"
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
                        className={`p-1 rounded hover:bg-slate-800 ${
                          row.isUnlinked ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
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
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                QS Audit Trail: The Working
              </h3>
              <button
                onClick={() => setFormulaModalRow(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Item Description:</span>
                <span className="font-semibold text-white">{formulaModalRow.itemName}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-emerald-300 break-words">
                {formulaModalRow.formula}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[11px]">Gross Quantity:</span>
                  <span className="font-mono">{formatDim(formulaModalRow.grossQty)} {formulaModalRow.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Deductions:</span>
                  <span className="font-mono text-red-400">-{formatDim(formulaModalRow.deductions)} {formulaModalRow.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Deduction Audit Notes:</span>
                  <span>{formulaModalRow.deductionNotes}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Net Calculated Total:</span>
                  <span className="font-mono font-bold text-amber-300">{formatDim(formulaModalRow.netTotal)} {formulaModalRow.unit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
