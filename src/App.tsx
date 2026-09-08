import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MeasurementItem,
  FolderNode,
  ScaleZone,
  DrawingSheet,
  CalculatedRow,
  RecipeType
} from './types/takeoff';
import {
  SAMPLE_SHEETS,
  INITIAL_FOLDERS,
  INITIAL_MEASUREMENTS,
  INITIAL_SCALE_ZONES
} from './data/sampleDrawings';
import { calculateMeasurementRows } from './utils/qsBrain';
import { BlueprintCanvas } from './components/BlueprintCanvas';
import { MeasurementSheet } from './components/MeasurementSheet';
import { FolderManager } from './components/FolderManager';
import { HiddenDimensionModal } from './components/HiddenDimensionModal';
import { RevisionSyncView } from './components/RevisionSyncView';
import {
  Compass,
  Layers,
  MousePointer,
  Minus,
  Maximize,
  Square,
  Crosshair,
  Sparkles,
  GitCompare,
  Upload,
  Download,
  Save,
  FileSpreadsheet,
  Ruler,
  Boxes,
  HelpCircle,
  FolderTree,
  ChevronDown,
  SplitSquareVertical,
  Maximize2,
  Minimize2,
  CheckCircle2
} from 'lucide-react';

const STORAGE_KEY = 'qs_takeoff_pro_data_v1';

export default function App() {
  // Persistence state
  const [sheets, setSheets] = useState<DrawingSheet[]>(SAMPLE_SHEETS);
  const [activeSheetId, setActiveSheetId] = useState<string>('sheet_arch_gf');
  const [activeRevision, setActiveRevision] = useState<'RevA' | 'RevB'>('RevA');

  const [folders, setFolders] = useState<FolderNode[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_folders`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_FOLDERS;
  });

  const [measurements, setMeasurements] = useState<MeasurementItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_measurements`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_MEASUREMENTS;
  });

  const [scaleZones, setScaleZones] = useState<ScaleZone[]>(INITIAL_SCALE_ZONES);

  // Active Tool & Navigation State
  const [activeTool, setActiveTool] = useState<'select' | 'line' | 'polygon' | 'rectangle' | 'void' | 'count' | 'calibrate'>('select');
  const [activeFolderId, setActiveFolderId] = useState<string>('sf_living');
  const [activeRecipeType, setActiveRecipeType] = useState<RecipeType>('floor');
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);

  // Cursor Features
  const [isMagnetEnabled, setIsMagnetEnabled] = useState(true);
  const [isMagnifierEnabled, setIsMagnifierEnabled] = useState(false);

  // Modals
  const [editingMeasurement, setEditingMeasurement] = useState<MeasurementItem | null>(null);
  const [isRevisionSyncOpen, setIsRevisionSyncOpen] = useState(false);

  // Split-Screen Layout Resizing (Top Canvas vs Bottom Sheet)
  const [splitPercent, setSplitPercent] = useState<number>(55); // 55% canvas, 45% sheet
  const [isSplitMaximized, setIsSplitMaximized] = useState<'normal' | 'max_canvas' | 'max_sheet'>('normal');
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_folders`, JSON.stringify(folders));
      localStorage.setItem(`${STORAGE_KEY}_measurements`, JSON.stringify(measurements));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [folders, measurements]);

  // Active Sheet
  const currentSheet = useMemo(() => {
    return sheets.find(s => s.id === activeSheetId) || sheets[0];
  }, [sheets, activeSheetId]);

  // Filter measurements for active sheet and revision
  const currentSheetMeasurements = useMemo(() => {
    return measurements.filter(m => {
      // In Rev B mode, prefer Rev B items; otherwise Rev A
      if (activeRevision === 'RevB') {
        return m.revision === 'RevB' || (m.revision === 'RevA' && !measurements.some(b => b.syncLinkedId === m.id));
      }
      return m.revision === 'RevA';
    });
  }, [measurements, activeRevision]);

  // Calculate QS Brain rows for the live audit grid
  const calculatedRows = useMemo(() => {
    return calculateMeasurementRows(currentSheetMeasurements, folders, currentSheet.scaleZones || scaleZones);
  }, [currentSheetMeasurements, folders, currentSheet.scaleZones, scaleZones]);

  // Splitter Drag Handler
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter || !mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const newPercent = Math.min(Math.max((relativeY / rect.height) * 100, 20), 85);
      setSplitPercent(newPercent);
      setIsSplitMaximized('normal');
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    if (isDraggingSplitter) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // Handle measurement completion from Canvas (opens Hidden Dimension Modal immediately)
  const handleCompleteMeasurement = (partialItem: Partial<MeasurementItem>) => {
    const newId = `m_${Date.now()}`;
    const newUid = `uid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newItem: MeasurementItem = {
      id: newId,
      uid: newUid,
      name: partialItem.name || 'New Takeoff Measurement',
      folderId: partialItem.folderId || activeFolderId,
      tool: partialItem.tool || 'polygon',
      points: partialItem.points || [],
      color: partialItem.color || '#0284c7',
      scaleZoneId: partialItem.scaleZoneId || currentSheet.scaleZones[0]?.id || 'sz_main_1_100',
      recipeType: partialItem.recipeType || activeRecipeType,
      recipeConfig: partialItem.recipeConfig || {},
      hiddenDimensionsPrompted: false,
      isUnlinkedMultiplier: false,
      isVoid: partialItem.isVoid,
      revision: activeRevision,
      timestamp: Date.now()
    };

    // Prompt for hidden dimensions immediately
    setEditingMeasurement(newItem);
  };

  // Save from Hidden Dimension Modal
  const handleSaveMeasurement = (savedItem: MeasurementItem) => {
    setMeasurements(prev => {
      const idx = prev.findIndex(m => m.id === savedItem.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedItem;
        return next;
      }
      return [...prev, savedItem];
    });
    setEditingMeasurement(null);
    setSelectedMeasurementId(savedItem.id);
    setActiveTool('select');
  };

  // Update measurement in place (e.g. vertex drag)
  const handleUpdateMeasurement = (id: string, updates: Partial<MeasurementItem>) => {
    setMeasurements(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  // Delete measurement
  const handleDeleteMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
    if (selectedMeasurementId === id) setSelectedMeasurementId(null);
  };

  // Toggle Unlink Multiplier
  const handleToggleUnlink = (id: string) => {
    setMeasurements(prev =>
      prev.map(m => (m.id === id ? { ...m, isUnlinkedMultiplier: !m.isUnlinkedMultiplier } : m))
    );
  };

  // Calibration tool callback
  const handleCalibrateZone = (zoneId: string, measuredPx: number, realMeters: number) => {
    const newPxPerM = measuredPx / realMeters;
    setScaleZones(prev =>
      prev.map(z => (z.id === zoneId ? { ...z, pixelsPerMeter: Math.round(newPxPerM) } : z))
    );
    alert(`Scale zone calibrated: 1.0 meter = ${newPxPerM.toFixed(1)} pixels.`);
    setActiveTool('select');
  };

  // Folder actions
  const handleAddFolder = (name: string, multiplier: number, parentId?: string) => {
    const newFolder: FolderNode = {
      id: `f_${Date.now()}`,
      name,
      code: `UNIT-${folders.length + 1}`,
      type: parentId ? 'subfolder' : 'folder',
      parentId,
      multiplier
    };
    setFolders(prev => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);
  };

  const handleUpdateFolderMultiplier = (folderId: string, multiplier: number) => {
    setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, multiplier } : f)));
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId && f.parentId !== folderId));
    if (activeFolderId === folderId) setActiveFolderId(folders[0]?.id || '');
  };

  // Revision Sync Engine
  const handleSyncAllToRevB = () => {
    const revAItems = measurements.filter(m => m.revision === 'RevA');
    const newRevBItems: MeasurementItem[] = revAItems.map(mA => {
      // Check if already has a synced Rev B version
      const existing = measurements.find(b => b.syncLinkedId === mA.id || (b.revision === 'RevB' && b.uid === mA.uid));
      if (existing) return existing;

      // Duplicate geometry to Rev B linked by UID
      return {
        ...mA,
        id: `m_revb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        revision: 'RevB',
        syncLinkedId: mA.id,
        name: `${mA.name} (Rev B)`
      };
    });

    setMeasurements(prev => {
      // Keep non-revB and add synced Rev B
      const nonRevB = prev.filter(m => m.revision === 'RevA');
      return [...nonRevB, ...newRevBItems];
    });

    setActiveRevision('RevB');
    alert('All Rev A measurements synchronized to Rev B with Unique IDs. You can now drag vertices to align with moved walls.');
  };

  // File Upload support (PDF or CAD image)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newSheet: DrawingSheet = {
      id: `sheet_upload_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      subtitle: `Uploaded Drawing • ${file.type || 'Architectural Plan'}`,
      type: 'uploaded',
      scaleZones: [
        {
          id: `sz_up_${Date.now()}`,
          name: 'Calibrated Scale (1:100)',
          ratio: '1:100',
          pixelsPerMeter: 40,
          isDefault: true
        }
      ],
      defaultScale: '1:100',
      revALabel: 'Uploaded Issue'
    };

    setSheets(prev => [newSheet, ...prev]);
    setActiveSheetId(newSheet.id);
  };

  // Export Project JSON
  const handleExportProject = () => {
    const projectData = {
      project: 'QS-Takeoff Pro Project',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      folders,
      scaleZones,
      measurements
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QS_Takeoff_Project_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* ============================================================ */}
      {/* TOP GLOBAL APP HEADER & CONTROLS                             */}
      {/* ============================================================ */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-md">
              <Ruler className="w-5 h-5 font-bold stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                QS-Takeoff <span className="text-amber-400 font-extrabold">PRO</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  v3.2
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Quantity Surveyor Master Blueprint Engine
              </span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Active Drawing Sheet Switcher */}
          <div className="flex items-center gap-1.5">
            <select
              value={activeSheetId}
              onChange={e => setActiveSheetId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-500"
            >
              {sheets.map(s => (
                <option key={s.id} value={s.id}>
                  📄 {s.title}
                </option>
              ))}
            </select>

            {/* Revision Toggle */}
            {currentSheet.hasRevisions && (
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setActiveRevision('RevA')}
                  className={`px-2 py-0.5 rounded font-mono transition ${
                    activeRevision === 'RevA'
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rev A (Tender)
                </button>
                <button
                  onClick={() => setActiveRevision('RevB')}
                  className={`px-2 py-0.5 rounded font-mono transition ${
                    activeRevision === 'RevB'
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rev B (Const.)
                </button>
              </div>
            )}

            {/* Side-by-Side Sync View Button */}
            {currentSheet.hasRevisions && (
              <button
                onClick={() => setIsRevisionSyncOpen(true)}
                title="Open Side-by-Side Revision Sync & Variance Engine"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-medium transition"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Revision Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Drawing Tools Toolbar */}
        <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-lg">
          {[
            { id: 'select', label: 'Select / Vertex Edit', icon: MousePointer },
            { id: 'line', label: 'Centerline Wall / Trench', icon: Minus },
            { id: 'polygon', label: 'Area / Sloped Roof', icon: Compass },
            { id: 'rectangle', label: 'Room Rectangle', icon: Square },
            { id: 'void', label: 'Auto-Void Cutout (-)', icon: Maximize },
            { id: 'count', label: 'Fitting / Door Count', icon: Crosshair },
            { id: 'calibrate', label: 'Scale Calibrate', icon: Ruler }
          ].map(tool => {
            const Icon = tool.icon;
            const isAct = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                title={tool.label}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                  isAct
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{tool.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: PDF Upload & Project Save */}
        <div className="flex items-center gap-2">
          {/* Upload PDF / Plan */}
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer border border-slate-700 transition">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload PDF / CAD</span>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Export Project JSON */}
          <button
            onClick={handleExportProject}
            title="Save and Export Project JSON (All measurements & UIDs)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save Project</span>
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN WORKSPACE BODY (Side Panel + Split-Screen Main Area)    */}
      {/* ============================================================ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Panel: Recipe & Folder Manager */}
        <FolderManager
          folders={folders}
          measurements={currentSheetMeasurements}
          scaleZones={currentSheet.scaleZones || scaleZones}
          activeFolderId={activeFolderId}
          onSelectFolder={setActiveFolderId}
          onAddFolder={handleAddFolder}
          onUpdateFolderMultiplier={handleUpdateFolderMultiplier}
          onDeleteFolder={handleDeleteFolder}
          onQuickRecipeSelect={recipe => {
            setActiveRecipeType(recipe);
            if (recipe === 'wall' || recipe === 'trench') setActiveTool('line');
            else if (recipe === 'count') setActiveTool('count');
            else setActiveTool('polygon');
          }}
          activeRecipeType={activeRecipeType}
          onTriggerCalibration={() => setActiveTool('calibrate')}
        />

        {/* Right Main Split Area (Top Drawing Canvas + Bottom Measurement Grid) */}
        <div ref={mainContainerRef} className="flex-1 flex flex-col overflow-hidden relative">
          {/* Top Half: Drawing Canvas */}
          <div
            style={{
              height:
                isSplitMaximized === 'max_canvas'
                  ? '100%'
                  : isSplitMaximized === 'max_sheet'
                  ? '0%'
                  : `${splitPercent}%`
            }}
            className="w-full relative overflow-hidden transition-all duration-75"
          >
            <BlueprintCanvas
              sheet={currentSheet}
              activeRevision={activeRevision}
              scaleZones={currentSheet.scaleZones || scaleZones}
              measurements={currentSheetMeasurements}
              selectedMeasurementId={selectedMeasurementId}
              activeTool={activeTool}
              activeFolderId={activeFolderId}
              onSelectMeasurement={setSelectedMeasurementId}
              onCompleteMeasurement={handleCompleteMeasurement}
              onUpdateMeasurement={handleUpdateMeasurement}
              onCalibrateZone={handleCalibrateZone}
              isMagnetEnabled={isMagnetEnabled}
              isMagnifierEnabled={isMagnifierEnabled}
              onToggleMagnet={() => setIsMagnetEnabled(!isMagnetEnabled)}
              onToggleMagnifier={() => setIsMagnifierEnabled(!isMagnifierEnabled)}
            />
          </div>

          {/* Resizable Split-Screen Divider */}
          <div
            onMouseDown={handleSplitterMouseDown}
            className={`h-2.5 w-full bg-slate-800 hover:bg-amber-500/80 active:bg-amber-500 cursor-row-resize flex items-center justify-center border-y border-slate-700 transition select-none z-20 group ${
              isDraggingSplitter ? 'bg-amber-500' : ''
            }`}
          >
            <div className="w-12 h-1 bg-slate-500 rounded-full group-hover:bg-slate-900 transition" />
            {/* Quick Maximize / Minimize Toggles */}
            <div className="absolute right-3 flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-[10px] text-slate-400">
              <button
                onClick={() => setIsSplitMaximized(isSplitMaximized === 'max_canvas' ? 'normal' : 'max_canvas')}
                title="Maximize Canvas"
                className="hover:text-white"
              >
                Canvas
              </button>
              <span>/</span>
              <button
                onClick={() => setIsSplitMaximized('normal')}
                title="Split 50/50"
                className="hover:text-white"
              >
                Split
              </button>
              <span>/</span>
              <button
                onClick={() => setIsSplitMaximized(isSplitMaximized === 'max_sheet' ? 'normal' : 'max_sheet')}
                title="Maximize Measurement Sheet"
                className="hover:text-white"
              >
                Sheet
              </button>
            </div>
          </div>

          {/* Bottom Half: Live Measurement Sheet Grid */}
          <div
            style={{
              height:
                isSplitMaximized === 'max_canvas'
                  ? '0%'
                  : isSplitMaximized === 'max_sheet'
                  ? '100%'
                  : `${100 - splitPercent}%`
            }}
            className="w-full relative overflow-hidden transition-all duration-75"
          >
            <MeasurementSheet
              rows={calculatedRows}
              measurements={currentSheetMeasurements}
              folders={folders}
              selectedMeasurementId={selectedMeasurementId}
              onSelectMeasurement={setSelectedMeasurementId}
              onEditMeasurement={id => {
                const target = measurements.find(m => m.id === id);
                if (target) setEditingMeasurement(target);
              }}
              onDeleteMeasurement={handleDeleteMeasurement}
              onToggleUnlink={handleToggleUnlink}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* QS BRAIN HIDDEN DIMENSIONS PROMPT MODAL                     */}
      {/* ============================================================ */}
      {editingMeasurement && (
        <HiddenDimensionModal
          isOpen={true}
          measurement={editingMeasurement}
          folders={folders}
          scaleZones={currentSheet.scaleZones || scaleZones}
          onSave={handleSaveMeasurement}
          onCancel={() => setEditingMeasurement(null)}
        />
      )}

      {/* ============================================================ */}
      {/* SIDE-BY-SIDE REVISION SYNC MODAL VIEW                       */}
      {/* ============================================================ */}
      {isRevisionSyncOpen && (
        <RevisionSyncView
          sheet={currentSheet}
          measurementsRevA={measurements.filter(m => m.revision === 'RevA')}
          measurementsRevB={measurements.filter(m => m.revision === 'RevB')}
          scaleZones={currentSheet.scaleZones || scaleZones}
          folders={folders}
          onSyncAllToRevB={handleSyncAllToRevB}
          onUpdateMeasurement={handleUpdateMeasurement}
          onClose={() => setIsRevisionSyncOpen(false)}
        />
      )}
    </div>
  );
}
