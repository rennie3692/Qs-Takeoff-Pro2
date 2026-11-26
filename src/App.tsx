import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MeasurementItem,
  FolderNode,
  ScaleZone,
  DrawingSheet,
  RecipeType
} from './types/takeoff';
import {
  SAMPLE_SHEETS,
  INITIAL_FOLDERS,
  INITIAL_MEASUREMENTS,
  INITIAL_SCALE_ZONES
} from './data/sampleDrawings';
import { calculateMeasurementRows } from './utils/qsBrain';
import { processUploadedPlanFile, renderPdfPage } from './utils/pdfLoader';
import { BlueprintCanvas } from './components/BlueprintCanvas';
import { MeasurementSheet } from './components/MeasurementSheet';
import { FolderManager } from './components/FolderManager';
import { SetupCalibrationView } from './components/SetupCalibrationView';
import { HiddenDimensionModal } from './components/HiddenDimensionModal';
import { RevisionSyncView } from './components/RevisionSyncView';
import { ScaleModal } from './components/ScaleModal';
import { ExecutiveTourModal } from './components/ExecutiveTourModal';
import { FloatingTakeoffDock, QuickPreset } from './components/FloatingTakeoffDock';
import { ContextualSidebarRail } from './components/ContextualSidebarRail';
import { LiveBoQDrawer } from './components/LiveBoQDrawer';
import { TradeAssignInspector } from './components/TradeAssignInspector';
import { CurrencyConfig, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from './utils/currency';
import {
  Compass,
  MousePointer,
  Minus,
  Maximize,
  Square,
  Crosshair,
  GitCompare,
  Upload,
  Save,
  FileSpreadsheet,
  Ruler,
  Boxes,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Calculator,
  Coins,
  Layers,
  Folder,
  FolderPlus,
  ChevronDown,
  X,
  Trash2,
  Edit3,
  Check
} from 'lucide-react';

const STORAGE_KEY = 'qs_takeoff_pro_data_v1';

export type AppStage = 'setup' | 'takeoff' | 'boq';

export default function App() {
  // 3-Stage Estimator Lifecycle: 'setup' -> 'takeoff' -> 'boq'
  const [currentStage, setCurrentStage] = useState<AppStage>('takeoff');

  // Currency Selection
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_currency`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.symbol === 'string' && typeof parsed.code === 'string') {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_CURRENCY;
  });

  // Welcome Executive Briefing Banner State
  const [showExecutiveBanner, setShowExecutiveBanner] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_show_exec_banner`);
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });

  // UI Drawer & Menu States
  const [isTakeoffDrawerOpen, setIsTakeoffDrawerOpen] = useState<boolean>(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState<boolean>(false);
  const [quickNewFolderName, setQuickNewFolderName] = useState<string>('');

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
  const [activePreset, setActivePreset] = useState<QuickPreset | null>(null);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);

  // Cursor Features
  const [isMagnetEnabled, setIsMagnetEnabled] = useState(true);
  const [isMagnifierEnabled, setIsMagnifierEnabled] = useState(false);

  // Modals
  const [editingMeasurement, setEditingMeasurement] = useState<MeasurementItem | null>(null);
  const [isRevisionSyncOpen, setIsRevisionSyncOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [lastAddedToast, setLastAddedToast] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Wireframe UI States
  const [activeSidebarTab, setActiveSidebarTab] = useState<'tools' | 'layers' | 'project' | 'settings' | null>(null);
  const [isLiveBoQExpanded, setIsLiveBoQExpanded] = useState<boolean>(false);
  const [isTradeInspectorOpen, setIsTradeInspectorOpen] = useState<boolean>(false);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_folders`, JSON.stringify(folders));
      localStorage.setItem(`${STORAGE_KEY}_measurements`, JSON.stringify(measurements));
      localStorage.setItem(`${STORAGE_KEY}_currency`, JSON.stringify(selectedCurrency));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [folders, measurements, selectedCurrency]);

  // Flattened folders map for instant access
  const flatFolderMap = useMemo(() => {
    const map = new Map<string, FolderNode>();
    for (const f of folders) {
      map.set(f.id, f);
    }
    return map;
  }, [folders]);

  const activeFolder = useMemo(() => {
    return flatFolderMap.get(activeFolderId);
  }, [flatFolderMap, activeFolderId]);

  // Active Sheet
  const currentSheet = useMemo(() => {
    return sheets.find(s => s.id === activeSheetId) || sheets[0];
  }, [sheets, activeSheetId]);

  // Filter measurements for active sheet and revision
  const currentSheetMeasurements = useMemo(() => {
    return measurements.filter(m => {
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

  // Total estimated value across current sheet
  const totalCost = useMemo(() => {
    return calculatedRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  }, [calculatedRows]);

  // Handle measurement completion from Canvas (opens Hidden Dimension Modal immediately)
  const handleCompleteMeasurement = (partialItem: Partial<MeasurementItem>) => {
    const newId = `m_${Date.now()}`;
    const newUid = `uid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const effectiveName = partialItem.name || (activePreset ? activePreset.name : 'New Takeoff Measurement');
    const effectiveRecipeType = partialItem.recipeType || (activePreset ? activePreset.recipeType : activeRecipeType);

    const newItem: MeasurementItem = {
      id: newId,
      uid: newUid,
      name: effectiveName,
      folderId: partialItem.folderId || activeFolderId,
      tool: partialItem.tool || (activePreset ? activePreset.tool : 'polygon'),
      points: partialItem.points || [],
      color: partialItem.color || (activePreset?.category === 'length' ? '#2563eb' : activePreset?.category === 'count' ? '#d97706' : '#059669'),
      scaleZoneId: partialItem.scaleZoneId || currentSheet.scaleZones[0]?.id || 'sz_main_1_100',
      recipeType: effectiveRecipeType,
      recipeConfig: partialItem.recipeConfig || (activePreset?.recipeType === 'wall' ? { height: 3.0, thickness: 0.225, outputLinear: true, outputArea: true, outputVolume: true } : {}),
      hiddenDimensionsPrompted: false,
      isUnlinkedMultiplier: false,
      isVoid: partialItem.isVoid,
      revision: activeRevision,
      timestamp: Date.now()
    };

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

    // Show temporary toast
    setLastAddedToast(savedItem.name);
    setTimeout(() => setLastAddedToast(null), 4500);
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
  const handleCalibrateZone = (zoneId: string, measuredPx: number, realMeters: number, ratio?: string) => {
    const newPxPerM = Math.round((measuredPx / realMeters) * 10) / 10;
    const computedRatio = ratio || `1:${Math.round(4000 / newPxPerM)}`;

    // Update global scaleZones
    setScaleZones(prev =>
      prev.map(z => (z.id === zoneId || !zoneId ? { ...z, pixelsPerMeter: newPxPerM, ratio: computedRatio } : z))
    );

    // Update active sheet in sheets list so currentSheet reflects the new scale immediately
    setSheets(prevSheets =>
      prevSheets.map(s => {
        if (s.id === activeSheetId) {
          const updatedZones = (s.scaleZones || []).map(z =>
            z.id === zoneId || !zoneId ? { ...z, pixelsPerMeter: newPxPerM, ratio: computedRatio } : z
          );
          return {
            ...s,
            scaleZones: updatedZones.length > 0 ? updatedZones : [
              {
                id: zoneId || 'sz_main',
                name: `Plan Scale (${computedRatio})`,
                ratio: computedRatio,
                pixelsPerMeter: newPxPerM,
                isDefault: true
              }
            ],
            defaultScale: computedRatio
          };
        }
        return s;
      })
    );

    setActiveTool('select');
    setLastAddedToast(`Scale calibrated to ${computedRatio} (${newPxPerM} px/m)`);
    setTimeout(() => setLastAddedToast(null), 4000);
  };

  // Direct scale preset or custom value application
  const handleApplyScale = (ratio: string, pixelsPerMeter: number) => {
    // Update global scaleZones
    setScaleZones(prev =>
      prev.map(z => ({ ...z, ratio, pixelsPerMeter }))
    );

    // Update active sheet in sheets list
    setSheets(prevSheets =>
      prevSheets.map(s => {
        if (s.id === activeSheetId) {
          const updatedZones = (s.scaleZones || []).map(z => ({
            ...z,
            ratio,
            pixelsPerMeter
          }));
          return {
            ...s,
            scaleZones: updatedZones.length > 0 ? updatedZones : [
              {
                id: 'sz_main',
                name: `Plan Scale (${ratio})`,
                ratio,
                pixelsPerMeter,
                isDefault: true
              }
            ],
            defaultScale: ratio
          };
        }
        return s;
      })
    );

    setLastAddedToast(`Scale updated to ${ratio} (${pixelsPerMeter} px/m)`);
    setTimeout(() => setLastAddedToast(null), 4000);
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
      const existing = measurements.find(b => b.syncLinkedId === mA.id || (b.revision === 'RevB' && b.uid === mA.uid));
      if (existing) return existing;

      return {
        ...mA,
        id: `m_revb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        revision: 'RevB',
        syncLinkedId: mA.id,
        name: `${mA.name} (Rev B)`
      };
    });

    setMeasurements(prev => {
      const nonRevB = prev.filter(m => m.revision === 'RevA');
      return [...nonRevB, ...newRevBItems];
    });

    setActiveRevision('RevB');
    alert('All Rev A measurements synchronized to Rev B with Unique IDs. You can now drag vertices to align with moved walls.');
  };

  // File Upload support (PDF or CAD image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText(`Loading and rendering "${file.name}"...`);

    try {
      const sheetId = `sheet_upload_${Date.now()}`;
      const rendered = await processUploadedPlanFile(file, 1, sheetId);
      
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      let rawBuffer: ArrayBuffer | undefined = undefined;
      if (isPdf) {
        try {
          const buf = await file.arrayBuffer();
          rawBuffer = buf.slice(0);
        } catch {
          // buffer read fallback
        }
      }

      const newSheet: DrawingSheet = {
        id: sheetId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        subtitle: `Uploaded ${isPdf ? 'PDF Plan' : 'Image Plan'} • ${rendered.width}×${rendered.height}px`,
        type: 'uploaded',
        url: rendered.dataUrl,
        width: rendered.width,
        height: rendered.height,
        pageCount: rendered.pageCount,
        currentPage: rendered.currentPage,
        rawBuffer,
        rawFile: file,
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
      setCurrentStage('takeoff');
      setLastAddedToast(`✓ Uploaded "${file.name}" is now displayed on the drawing plan!`);
      setTimeout(() => setLastAddedToast(null), 5000);
    } catch (err: any) {
      console.error('Error processing uploaded plan:', err);
      alert(`Could not display uploaded file: ${err?.message || 'Please check that the file is a valid PDF or image.'}`);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  // Switch pages for multi-page uploaded PDF plans
  const handleChangeSheetPage = async (sheetId: string, pageNum: number) => {
    const targetSheet = sheets.find(s => s.id === sheetId);
    if (!targetSheet) return;

    // Prefer rawFile if present as it creates fresh ArrayBuffers on demand, otherwise use non-detached rawBuffer
    const source = targetSheet.rawFile || targetSheet.rawBuffer;
    if (!source) {
      alert('Cannot change page: No original document data found for this sheet.');
      return;
    }

    setIsUploading(true);
    setUploadProgressText(`Rendering Page ${pageNum} of ${targetSheet.pageCount || 1}...`);

    try {
      const rendered = await renderPdfPage(source, pageNum, 1200, sheetId);
      setSheets(prev =>
        prev.map(s =>
          s.id === sheetId
            ? {
                ...s,
                url: rendered.dataUrl,
                width: rendered.width,
                height: rendered.height,
                currentPage: rendered.currentPage
              }
            : s
        )
      );
    } catch (err: any) {
      console.error('Failed to change PDF page:', err);
      alert(`Could not load page ${pageNum}: ${err?.message || 'Error rendering page'}`);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
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

  // Transition helper from Calculation row to Plan view
  const handleViewOnPlan = (measurementId: string) => {
    setSelectedMeasurementId(measurementId);
    setCurrentStage('takeoff');
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      {/* ============================================================ */}
      {/* TOP GLOBAL APP NAVIGATION & STEPPER                          */}
      {/* ============================================================ */}
      <header className="min-h-14 bg-white border-b border-slate-200 px-2.5 sm:px-4 py-1.5 sm:py-0 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 shrink-0 z-30 shadow-xs">
        {/* Left: Brand & Drawing Sheet Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Compass className="w-5 h-5 font-bold stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                QS-Takeoff <span className="text-emerald-700 font-extrabold">PRO</span>
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200 font-medium">
                  Easy Estimator
                </span>
              </span>
              <span className="text-[10px] text-slate-500 hidden md:block -mt-0.5">
                Measure drawings & calculate construction costs easily
              </span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-0.5 sm:mx-1" />

          {/* Active Drawing Sheet Switcher */}
          <div className="flex items-center gap-1.5">
            <select
              value={activeSheetId}
              onChange={e => setActiveSheetId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600 shadow-xs max-w-[120px] sm:max-w-none truncate"
            >
              {sheets.map(s => (
                <option key={s.id} value={s.id}>
                  📄 {s.title}
                </option>
              ))}
            </select>

            {/* Revision Toggle */}
            {currentSheet.hasRevisions && (
              <div className="hidden sm:flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setActiveRevision('RevA')}
                  className={`px-2 py-0.5 rounded font-mono transition ${
                    activeRevision === 'RevA'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rev A (Tender)
                </button>
                <button
                  onClick={() => setActiveRevision('RevB')}
                  className={`px-2 py-0.5 rounded font-mono transition ${
                    activeRevision === 'RevB'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
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
                title="Compare and sync changes between Rev A and Rev B drawings"
                className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium transition shadow-xs"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compare Revisions</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: 3-Stage Stepper Workflow Navigation */}
        <nav className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 sm:p-1 rounded-xl shadow-xs text-xs">
          <button
            onClick={() => setCurrentStage('setup')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              currentStage === 'setup'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1. Setup & Scale</span>
            <span className="sm:hidden">1. Setup</span>
          </button>

          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

          <button
            onClick={() => setCurrentStage('takeoff')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              currentStage === 'takeoff'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2. Takeoff Canvas</span>
            <span className="sm:hidden">2. Canvas</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              currentStage === 'takeoff' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {currentSheetMeasurements.length}
            </span>
          </button>

          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

          <button
            onClick={() => setCurrentStage('boq')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              currentStage === 'boq'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3. BoQ & Costs</span>
            <span className="sm:hidden">3. BoQ</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              currentStage === 'boq' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {selectedCurrency.symbol}{Math.round(totalCost).toLocaleString()}
            </span>
          </button>
        </nav>

        {/* Right Actions: Currency Selector, Next Stage CTA & Upload/Save */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Global Currency Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs shadow-xs">
            <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <select
              value={selectedCurrency.code}
              onChange={e => {
                const found = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                if (found) setSelectedCurrency(found);
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

          {currentStage === 'setup' && (
            <button
              onClick={() => setCurrentStage('takeoff')}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <span>Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {currentStage === 'boq' && (
            <button
              onClick={() => setCurrentStage('takeoff')}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-blue-700 hover:text-blue-800 text-xs font-semibold border border-slate-300 shadow-xs transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>
          )}

          {/* Upload PDF / Plan */}
          <label className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer border border-slate-300 shadow-xs transition">
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Upload Plan</span>
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
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-emerald-700 border border-slate-300 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Executive Welcome Briefing / Tour Button */}
          <button
            onClick={() => setShowExecutiveBanner(true)}
            title="Open Executive Briefing & Dashboard Overview"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-blue-700 hover:text-blue-800 border border-blue-200 shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Executive Guide</span>
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* EXECUTIVE TOUR / BRIEFING MODAL                              */}
      {/* ============================================================ */}
      <ExecutiveTourModal
        isOpen={showExecutiveBanner}
        onClose={() => setShowExecutiveBanner(false)}
        currentStage={currentStage}
        onSelectStage={setCurrentStage}
        selectedCurrency={selectedCurrency}
        totalMeasurements={measurements.length}
        totalProjectCost={totalCost}
      />

      {/* ============================================================ */}
      {/* SCREEN TRANSITIONS CONTAINER                                 */}
      {/* ============================================================ */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ========================================================== */}
          {/* STAGE 1: SETUP & CALIBRATION STAGE                         */}
          {/* ========================================================== */}
          {currentStage === 'setup' && (
            <motion.div
              key="setup-stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col overflow-hidden"
            >
              <SetupCalibrationView
                sheets={sheets}
                activeSheetId={activeSheetId}
                onSelectSheet={setActiveSheetId}
                onFileUpload={handleFileUpload}
                scaleZones={currentSheet.scaleZones || scaleZones}
                currentScale={(currentSheet.scaleZones || scaleZones)[0]}
                onOpenScaleModal={() => setIsScaleModalOpen(true)}
                onTriggerCalibration={() => {
                  setActiveTool('calibrate');
                  setCurrentStage('takeoff');
                }}
                onApplyScale={handleApplyScale}
                folders={folders}
                measurements={currentSheetMeasurements}
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
                selectedCurrency={selectedCurrency}
                onSelectCurrency={setSelectedCurrency}
                onProceedToTakeoff={() => setCurrentStage('takeoff')}
                onOpenBoQ={() => setCurrentStage('boq')}
              />
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STAGE 2: FULL-WIDTH TAKEOFF CANVAS WITH 60PX SIDEBAR RAIL */}
          {/* ========================================================== */}
          {currentStage === 'takeoff' && (
            <motion.div
              key="takeoff-stage"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex overflow-hidden bg-[#f8fafc] relative"
            >
              {/* Contextual 60px Left Sidebar Rail */}
              <ContextualSidebarRail
                currentStage={currentStage}
                onSelectStage={setCurrentStage}
                activeSidebarTab={activeSidebarTab}
                onSelectSidebarTab={setActiveSidebarTab}
                isMagnetEnabled={isMagnetEnabled}
                onToggleMagnet={() => setIsMagnetEnabled(!isMagnetEnabled)}
                isMagnifierEnabled={isMagnifierEnabled}
                onToggleMagnifier={() => setIsMagnifierEnabled(!isMagnifierEnabled)}
                onOpenScaleModal={() => setIsScaleModalOpen(true)}
                onOpenExecutiveGuide={() => setShowExecutiveBanner(true)}
              />

              {/* Contextual Sidebar Flyout (when Layers or Project tab is active) */}
              {activeSidebarTab === 'layers' && (
                <div className="w-72 h-full border-r border-slate-200 bg-white/95 backdrop-blur-md shadow-lg flex flex-col z-30 shrink-0 animate-in slide-in-from-left duration-200">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#00796B]" />
                      <span className="text-xs font-bold text-slate-900">Drawing Sheets & Revisions</span>
                    </div>
                    <button
                      onClick={() => setActiveSidebarTab(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 space-y-2 overflow-y-auto flex-1 text-xs">
                    <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Active Drawing</div>
                    {sheets.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSheetId(s.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          activeSheetId === s.id
                            ? 'border-[#00796B] bg-[#00796B]/5 text-[#00796B] font-bold shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="truncate">{s.title}</span>
                        {activeSheetId === s.id && <Check className="w-3.5 h-3.5 text-[#00796B] shrink-0" />}
                      </button>
                    ))}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Revision Sync</div>
                      <button
                        onClick={() => setIsRevisionSyncOpen(true)}
                        className="w-full py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Compare Rev A / Rev B</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSidebarTab === 'project' && (
                <div className="w-80 h-full border-r border-slate-200 bg-white/95 backdrop-blur-md shadow-lg flex flex-col z-30 shrink-0 animate-in slide-in-from-left duration-200">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-slate-900">Trade Folders & Multipliers</span>
                    </div>
                    <button
                      onClick={() => setActiveSidebarTab(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <FolderManager
                      folders={folders}
                      activeFolderId={activeFolderId}
                      onSelectFolder={setActiveFolderId}
                      onAddFolder={handleAddFolder}
                      onUpdateMultiplier={handleUpdateFolderMultiplier}
                      onDeleteFolder={handleDeleteFolder}
                    />
                  </div>
                </div>
              )}

              {/* Main Full-Height Blueprint Canvas Area */}
              <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#f8fafc]">
                {/* Canvas Component Taking 100% Full Width */}
                <div className="flex-1 relative overflow-hidden bg-[#f8fafc]">
                  {/* Modern Floating Command Dock (Bottom-Center) */}
                  <FloatingTakeoffDock
                    activeTool={activeTool}
                    onSelectTool={setActiveTool}
                    folders={folders}
                    activeFolderId={activeFolderId}
                    onSelectFolder={setActiveFolderId}
                    onAddFolder={handleAddFolder}
                    scaleZone={(currentSheet.scaleZones || scaleZones)[0]}
                    onOpenScaleModal={() => setIsScaleModalOpen(true)}
                    isMagnetEnabled={isMagnetEnabled}
                    onToggleMagnet={() => setIsMagnetEnabled(!isMagnetEnabled)}
                    isMagnifierEnabled={isMagnifierEnabled}
                    onToggleMagnifier={() => setIsMagnifierEnabled(!isMagnifierEnabled)}
                    isDrawerOpen={isTakeoffDrawerOpen}
                    onToggleDrawer={() => setIsTakeoffDrawerOpen(!isTakeoffDrawerOpen)}
                    measurementsCount={currentSheetMeasurements.length}
                    totalCost={totalCost}
                    selectedCurrency={selectedCurrency}
                    onOpenBoQ={() => setCurrentStage('boq')}
                    onBackToSetup={() => setCurrentStage('setup')}
                    onApplyPreset={(preset) => {
                      setActivePreset(preset);
                      setActiveRecipeType(preset.recipeType);
                      setLastAddedToast(`Activated preset: ${preset.name} (${preset.autoFormula})`);
                      setTimeout(() => setLastAddedToast(null), 3500);
                    }}
                  />

                  <BlueprintCanvas
                    sheet={currentSheet}
                    activeRevision={activeRevision}
                    scaleZones={currentSheet.scaleZones || scaleZones}
                    measurements={currentSheetMeasurements}
                    selectedMeasurementId={selectedMeasurementId}
                    activeTool={activeTool}
                    activeFolderId={activeFolderId}
                    onSelectMeasurement={id => {
                      setSelectedMeasurementId(id);
                      if (id) {
                        setIsTradeInspectorOpen(true);
                      }
                    }}
                    onCompleteMeasurement={handleCompleteMeasurement}
                    onUpdateMeasurement={handleUpdateMeasurement}
                    onCalibrateZone={handleCalibrateZone}
                    onOpenScaleModal={() => setIsScaleModalOpen(true)}
                    onCancelCalibrate={() => setActiveTool('select')}
                    isMagnetEnabled={isMagnetEnabled}
                    isMagnifierEnabled={isMagnifierEnabled}
                    onToggleMagnet={() => setIsMagnetEnabled(!isMagnetEnabled)}
                    onToggleMagnifier={() => setIsMagnifierEnabled(!isMagnifierEnabled)}
                    onChangePage={handleChangeSheetPage}
                    onSelectTool={setActiveTool}
                  />

                  {/* Contextual Floating Trade Inspector Popup */}
                  {isTradeInspectorOpen && selectedMeasurementId && (
                    (() => {
                      const selItem = measurements.find(m => m.id === selectedMeasurementId);
                      if (!selItem) return null;
                      return (
                        <TradeAssignInspector
                          measurement={selItem}
                          folders={folders}
                          currencySymbol={selectedCurrency.symbol}
                          onUpdateTrade={handleUpdateMeasurement}
                          onClose={() => setIsTradeInspectorOpen(false)}
                          onOpenFullModal={() => {
                            setIsTradeInspectorOpen(false);
                            setEditingMeasurement(selItem);
                          }}
                        />
                      );
                    })()
                  )}

                  {/* Collapsible Bottom-Right Live BoQ Drawer */}
                  <LiveBoQDrawer
                    measurements={currentSheetMeasurements}
                    folders={folders}
                    currencySymbol={selectedCurrency?.symbol || '$'}
                    selectedCurrency={selectedCurrency}
                    totalCost={totalCost}
                    selectedMeasurementId={selectedMeasurementId}
                    onOpenFullBoQ={() => setCurrentStage('boq')}
                    onSelectMeasurement={id => {
                      setSelectedMeasurementId(id);
                      setIsTradeInspectorOpen(true);
                    }}
                    onEditMeasurement={item => setEditingMeasurement(item)}
                    isExpanded={isLiveBoQExpanded}
                    onToggleExpand={() => setIsLiveBoQExpanded(!isLiveBoQExpanded)}
                  />

                  {/* Temporary Toast after saving measurement */}
                  {lastAddedToast && (
                    <div className="absolute top-4 right-5 z-30 animate-in fade-in slide-in-from-top-2">
                      <div className="bg-white border border-emerald-300 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 text-xs text-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Saved: <strong className="text-slate-900">{lastAddedToast}</strong></span>
                        <button
                          onClick={() => setCurrentStage('boq')}
                          className="ml-2 underline font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                        >
                          View in BoQ →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Legacy Slide-Out Measured Items Drawer (Optional on demand) */}
              {isTakeoffDrawerOpen && (
                <div className="w-full sm:w-80 h-full fixed sm:relative right-0 top-0 bottom-0 border-l border-slate-200 bg-white shadow-xl flex flex-col z-40 sm:z-20 shrink-0 animate-in slide-in-from-right duration-200">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Sheet Items ({currentSheetMeasurements.length})
                      </span>
                    </div>
                    <button
                      onClick={() => setIsTakeoffDrawerOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Measurement Items List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {currentSheetMeasurements.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400">
                        No measurements taken on this sheet yet. Click Draw Wall or Measure Room to start!
                      </div>
                    ) : (
                      currentSheetMeasurements.map(item => {
                        const folder = flatFolderMap.get(item.folderId);
                        const isSelected = selectedMeasurementId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedMeasurementId(item.id)}
                            className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="font-bold text-slate-900 truncate">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                                {item.recipeType.toUpperCase()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                              <span className="truncate">{folder?.name || 'General'}</span>
                              <span className="font-mono text-slate-700">
                                x{item.isUnlinked ? 1 : folder?.multiplier || 1}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                              <span className="font-mono font-bold text-emerald-700">
                                {item.unitRate
                                  ? `${selectedCurrency.symbol}${((item.unitRate || 0) * (item.points?.length || 1)).toFixed(0)}`
                                  : 'Calculated in BoQ'}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditingMeasurement(item);
                                  }}
                                  title="Edit 3D Dimensions & Unit Rate"
                                  className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteMeasurement(item.id);
                                  }}
                                  title="Delete Measurement"
                                  className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer CTA to BoQ */}
                  <div className="p-3 border-t border-slate-200 bg-slate-50">
                    <button
                      onClick={() => {
                        setIsTakeoffDrawerOpen(false);
                        setCurrentStage('boq');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Open Full BoQ Spreadsheet →</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STAGE 3: BILL OF QUANTITIES & TENDER SUMMARY               */}
          {/* ========================================================== */}
          {currentStage === 'boq' && (
            <motion.div
              key="boq-stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col overflow-hidden bg-[#f8fafc]"
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
                onBackToPlan={() => setCurrentStage('takeoff')}
                onViewOnPlan={handleViewOnPlan}
                currencySymbol={selectedCurrency.symbol}
                currencyCode={selectedCurrency.code}
                onCurrencyChange={setSelectedCurrency}
              />
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* ============================================================ */}
      {/* DRAWING SCALE SETTINGS & CALIBRATION MODAL                  */}
      {/* ============================================================ */}
      <ScaleModal
        isOpen={isScaleModalOpen}
        currentScale={(currentSheet.scaleZones || scaleZones)[0]}
        sheetTitle={currentSheet.title}
        onClose={() => setIsScaleModalOpen(false)}
        onApplyScale={handleApplyScale}
        onStartTwoPointCalibration={() => {
          setIsScaleModalOpen(false);
          setActiveTool('calibrate');
          setCurrentStage('takeoff');
        }}
      />

      {/* ============================================================ */}
      {/* PLAN UPLOAD & PDF RENDERING LOADING OVERLAY                  */}
      {/* ============================================================ */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 max-w-sm text-center">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-slate-900">Rendering Architectural Drawing</span>
            <span className="text-xs text-slate-600">{uploadProgressText}</span>
            <span className="text-[11px] text-blue-700 mt-1 font-medium">
              Converting high-resolution CAD/PDF vectors for crisp plan viewing...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
