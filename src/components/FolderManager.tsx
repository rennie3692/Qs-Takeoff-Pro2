import React, { useState } from 'react';
import { FolderNode, MeasurementItem, RecipeType, ScaleZone } from '../types/takeoff';
import {
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Compass,
  Boxes,
  Ruler,
  CheckSquare,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Unlink,
  Link,
  Target
} from 'lucide-react';

interface FolderManagerProps {
  folders: FolderNode[];
  measurements: MeasurementItem[];
  scaleZones: ScaleZone[];
  activeFolderId: string;
  onSelectFolder: (id: string) => void;
  onAddFolder: (name: string, multiplier: number, parentId?: string) => void;
  onUpdateFolderMultiplier: (folderId: string, multiplier: number) => void;
  onDeleteFolder: (folderId: string) => void;
  onQuickRecipeSelect: (recipeType: RecipeType) => void;
  activeRecipeType: RecipeType;
  onTriggerCalibration: () => void;
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  folders,
  measurements,
  scaleZones,
  activeFolderId,
  onSelectFolder,
  onAddFolder,
  onUpdateFolderMultiplier,
  onDeleteFolder,
  onQuickRecipeSelect,
  activeRecipeType,
  onTriggerCalibration
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderMultiplier, setNewFolderMultiplier] = useState(1);
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>(undefined);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const rootFolders = folders.filter(f => !f.parentId);
  const getSubfolders = (parentId: string) => folders.filter(f => f.parentId === parentId);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onAddFolder(newFolderName.trim(), newFolderMultiplier, newFolderParentId);
    setNewFolderName('');
    setNewFolderMultiplier(1);
    setNewFolderParentId(undefined);
    setIsCreatingFolder(false);
  };

  return (
    <aside className="w-80 h-full bg-slate-900 border-r border-slate-700 flex flex-col text-slate-200 select-none overflow-hidden font-sans">
      {/* Side Panel Header */}
      <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs uppercase tracking-wider">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Recipe & Hierarchy Manager</span>
        </div>
        <button
          onClick={() => setIsCreatingFolder(!isCreatingFolder)}
          title="Add New Folder / Unit"
          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-amber-400 transition"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Create Folder Form */}
        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="p-3 bg-slate-950 rounded-lg border border-slate-700 space-y-2.5 text-xs animate-in fade-in">
            <span className="font-semibold text-amber-400 block">Add Unit or Room Folder</span>
            <div>
              <label className="block text-slate-400 mb-0.5 text-[11px]">Folder / Unit Name:</label>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g. Typical Flat B or Bedroom 3"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-0.5 text-[11px]">Multiplier:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newFolderMultiplier}
                  onChange={e => setNewFolderMultiplier(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-0.5 text-[11px]">Parent Unit:</label>
                <select
                  value={newFolderParentId || ''}
                  onChange={e => setNewFolderParentId(e.target.value || undefined)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">(None - Top Unit)</option>
                  {rootFolders.map(rf => (
                    <option key={rf.id} value={rf.id}>
                      {rf.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-amber-500 text-slate-950 font-semibold rounded hover:bg-amber-400"
              >
                Add Folder
              </button>
            </div>
          </form>
        )}

        {/* Project Hierarchy Tree */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Hierarchy: Unit &gt; Room &gt; Takeoffs
          </span>

          <div className="space-y-1">
            {rootFolders.map(rf => {
              const subfolders = getSubfolders(rf.id);
              const isCollapsed = collapsedFolders[rf.id];
              const isSelected = activeFolderId === rf.id;
              const unitCount = measurements.filter(m => m.folderId === rf.id).length;

              return (
                <div key={rf.id} className="rounded-md overflow-hidden bg-slate-950/50 border border-slate-800">
                  {/* Parent Folder Header */}
                  <div
                    onClick={() => onSelectFolder(rf.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition ${
                      isSelected ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {subfolders.length > 0 ? (
                        <button onClick={e => toggleCollapse(rf.id, e)} className="p-0.5 text-slate-400 hover:text-white">
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <div className="w-4" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-xs truncate">{rf.name}</span>
                    </div>

                    {/* Multiplier Tag & Controls */}
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <div className="flex items-center gap-1 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800 text-blue-300">
                        <span>x</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={rf.multiplier}
                          onClick={e => e.stopPropagation()}
                          onChange={e => onUpdateFolderMultiplier(rf.id, parseInt(e.target.value) || 1)}
                          className="w-7 bg-transparent text-center focus:outline-none focus:bg-blue-900 rounded"
                        />
                      </div>
                      <span className="text-slate-500 text-[10px]">({unitCount})</span>
                    </div>
                  </div>

                  {/* Sub-Folders (Rooms) */}
                  {!isCollapsed && subfolders.length > 0 && (
                    <div className="pl-6 pr-2 py-1 space-y-1 bg-slate-950/30 border-t border-slate-800/70">
                      {subfolders.map(sf => {
                        const isSubSelected = activeFolderId === sf.id;
                        const subCount = measurements.filter(m => m.folderId === sf.id).length;

                        return (
                          <div
                            key={sf.id}
                            onClick={() => onSelectFolder(sf.id)}
                            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition text-xs ${
                              isSubSelected ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-slate-600">↳</span>
                              <span className="truncate">{sf.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {subCount} items
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Recipe Templates Selection */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 block">
            Active QS Recipe Template
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { id: 'wall', label: 'Wall & Cavity', icon: Boxes, color: 'text-red-400' },
              { id: 'trench', label: 'Trench Excavation', icon: Ruler, color: 'text-orange-400' },
              { id: 'roof', label: 'Roof 30° Pitch', icon: Compass, color: 'text-purple-400' },
              { id: 'ceiling', label: 'Ceiling Bulkhead', icon: Layers, color: 'text-cyan-400' },
              { id: 'floor', label: 'Floor & Skirting', icon: CheckSquare, color: 'text-emerald-400' },
              { id: 'count', label: 'Door Counts', icon: Sliders, color: 'text-amber-400' }
            ].map(rec => {
              const Icon = rec.icon;
              const isAct = activeRecipeType === rec.id;
              return (
                <button
                  key={rec.id}
                  onClick={() => onQuickRecipeSelect(rec.id as RecipeType)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                    isAct
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${rec.color}`} />
                  <span className="truncate">{rec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scale Calibration Zones Card */}
        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Scale Zones on Sheet
            </span>
            <button
              onClick={onTriggerCalibration}
              title="Calibrate Scale on Drawing (Draw known dimension line)"
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 transition"
            >
              <Target className="w-3 h-3" />
              <span>Calibrate</span>
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            {scaleZones.map(sz => (
              <div
                key={sz.id}
                className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-200 block text-xs">{sz.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Factor: {sz.pixelsPerMeter} px = 1.0 meter
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-amber-300 font-bold">
                  {sz.ratio}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
