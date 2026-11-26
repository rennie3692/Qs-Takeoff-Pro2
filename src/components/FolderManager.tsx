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
  onOpenScaleModal?: () => void;
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
  onTriggerCalibration,
  onOpenScaleModal
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
    <aside className="w-80 h-full bg-white border-r border-slate-200 flex flex-col text-slate-800 select-none overflow-hidden font-sans">
      {/* Side Panel Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Rooms & Construction</span>
        </div>
        <button
          onClick={() => setIsCreatingFolder(!isCreatingFolder)}
          title="Add New Room or Unit"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-blue-700 hover:text-blue-800 text-xs font-semibold shadow-xs border border-slate-300 transition"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>+ Add Room</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Create Folder Form */}
        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs animate-in fade-in shadow-xs">
            <span className="font-bold text-slate-900 block">Add New Room or Section</span>
            <div>
              <label className="block text-slate-600 mb-0.5 text-[11px] font-medium">Room / Section Name:</label>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g. Master Bedroom, Kitchen, or Unit A"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-0.5 text-[11px] font-medium">Repeat (e.g. 5 units):</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newFolderMultiplier}
                  onChange={e => setNewFolderMultiplier(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5 text-[11px] font-medium">Belongs Under:</label>
                <select
                  value={newFolderParentId || ''}
                  onChange={e => setNewFolderParentId(e.target.value || undefined)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
                >
                  <option value="">(None - Main Level)</option>
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
                className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-xs"
              >
                Save Room
              </button>
            </div>
          </form>
        )}

        {/* Project Hierarchy Tree */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Rooms & Locations
          </span>

          <div className="space-y-1.5">
            {rootFolders.map(rf => {
              const subfolders = getSubfolders(rf.id);
              const isCollapsed = collapsedFolders[rf.id];
              const isSelected = activeFolderId === rf.id;
              const unitCount = measurements.filter(m => m.folderId === rf.id).length;

              return (
                <div key={rf.id} className="rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs">
                  {/* Parent Folder Header */}
                  <div
                    onClick={() => onSelectFolder(rf.id)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition ${
                      isSelected ? 'bg-blue-50 text-blue-900 font-semibold border-l-4 border-blue-600' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {subfolders.length > 0 ? (
                        <button onClick={e => toggleCollapse(rf.id, e)} className="p-0.5 text-slate-400 hover:text-slate-700">
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <div className="w-4" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-xs truncate font-medium">{rf.name}</span>
                    </div>

                    {/* Multiplier Tag & Controls */}
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200 text-blue-800 font-semibold">
                        <span>x</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={rf.multiplier}
                          onClick={e => e.stopPropagation()}
                          onChange={e => onUpdateFolderMultiplier(rf.id, parseInt(e.target.value) || 1)}
                          className="w-7 bg-transparent text-center focus:outline-none focus:bg-blue-100 rounded"
                        />
                      </div>
                      <span className="text-slate-400 text-[10px]">({unitCount})</span>
                    </div>
                  </div>

                  {/* Sub-Folders (Rooms) */}
                  {!isCollapsed && subfolders.length > 0 && (
                    <div className="pl-6 pr-2 py-1 space-y-1 bg-slate-50/70 border-t border-slate-100">
                      {subfolders.map(sf => {
                        const isSubSelected = activeFolderId === sf.id;
                        const subCount = measurements.filter(m => m.folderId === sf.id).length;

                        return (
                          <div
                            key={sf.id}
                            onClick={() => onSelectFolder(sf.id)}
                            className={`flex items-center justify-between px-2.5 py-1 rounded-lg cursor-pointer transition text-xs ${
                              isSubSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-slate-400">↳</span>
                              <span className="truncate">{sf.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
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

        {/* Quick Measure Types Selection */}
        <div className="space-y-2 pt-3 border-t border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 block">
            Select Construction Type
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { id: 'wall', label: 'Walls & Brickwork', icon: Boxes, color: 'text-rose-600' },
              { id: 'trench', label: 'Foundation Trench', icon: Ruler, color: 'text-amber-700' },
              { id: 'roof', label: 'Roof (30° Slope)', icon: Compass, color: 'text-indigo-600' },
              { id: 'ceiling', label: 'Ceiling & Drywall', icon: Layers, color: 'text-teal-600' },
              { id: 'floor', label: 'Floors & Skirting', icon: CheckSquare, color: 'text-emerald-700' },
              { id: 'count', label: 'Doors & Fittings', icon: Sliders, color: 'text-blue-600' }
            ].map(rec => {
              const Icon = rec.icon;
              const isAct = activeRecipeType === rec.id;
              return (
                <button
                  key={rec.id}
                  onClick={() => onQuickRecipeSelect(rec.id as RecipeType)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                    isAct
                      ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${rec.color}`} />
                  <span className="truncate font-medium">{rec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawing Scale / Ruler Card */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Drawing Scale & Ruler
            </span>
            <button
              onClick={onOpenScaleModal || onTriggerCalibration}
              title="Open scale settings, presets, or calibrate ruler"
              className="flex items-center gap-1 text-[11px] text-white font-semibold bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg shadow-xs transition"
            >
              <Target className="w-3 h-3" />
              <span>Set Scale</span>
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            {scaleZones.map(sz => (
              <div
                key={sz.id}
                onClick={onOpenScaleModal || onTriggerCalibration}
                title="Click to view or edit drawing scale"
                className="p-2 rounded-lg bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 shadow-xs flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <span className="font-bold text-slate-900 block text-xs">{sz.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    1.0 meter = {sz.pixelsPerMeter} pixels
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 font-mono text-[10px] text-blue-700 font-bold">
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
