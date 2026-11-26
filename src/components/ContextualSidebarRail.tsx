import React from 'react';
import {
  Compass,
  Layers,
  FolderTree,
  Settings,
  Ruler,
  Magnet,
  Search,
  Upload,
  Save,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { AppStage } from '../App';

interface ContextualSidebarRailProps {
  currentStage: AppStage;
  onSelectStage: (stage: AppStage) => void;
  activeSidebarTab: 'tools' | 'layers' | 'project' | 'settings' | null;
  onSelectSidebarTab: (tab: 'tools' | 'layers' | 'project' | 'settings' | null) => void;
  isMagnetEnabled: boolean;
  onToggleMagnet: () => void;
  isMagnifierEnabled: boolean;
  onToggleMagnifier: () => void;
  onOpenScaleModal: () => void;
  onOpenExecutiveGuide: () => void;
}

export const ContextualSidebarRail: React.FC<ContextualSidebarRailProps> = ({
  currentStage,
  onSelectStage,
  activeSidebarTab,
  onSelectSidebarTab,
  isMagnetEnabled,
  onToggleMagnet,
  isMagnifierEnabled,
  onToggleMagnifier,
  onOpenScaleModal,
  onOpenExecutiveGuide
}) => {
  return (
    <aside
      className="hidden md:flex w-[60px] h-full bg-white border-r border-slate-200 flex-col items-center py-3 z-30 shrink-0 select-none shadow-xs"
      style={{ minWidth: '60px' }}
    >
      {/* Top Logo / App Icon Badge */}
      <div className="mb-4">
        <button
          onClick={() => onSelectStage('setup')}
          className="w-10 h-10 rounded-xl bg-[#333331] text-white flex items-center justify-center font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
          title="QS Takeoff Pro - Project Home"
        >
          <Compass className="w-5 h-5 text-emerald-400" />
        </button>
      </div>

      <div className="w-8 h-[1px] bg-slate-200 mb-3" />

      {/* Navigation & Contextual Rail Items (Tools, Layers, Project) */}
      <div className="flex flex-col items-center gap-2.5 w-full px-2">
        {/* Tools Icon */}
        <button
          onClick={() => {
            onSelectStage('takeoff');
            onSelectSidebarTab(activeSidebarTab === 'tools' ? null : 'tools');
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            currentStage === 'takeoff'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Takeoff Tools (Canvas)"
        >
          <Compass className="w-4 h-4" />
          <span className="text-[9px] font-semibold">Tools</span>
        </button>

        {/* Layers Icon */}
        <button
          onClick={() => {
            onSelectSidebarTab(activeSidebarTab === 'layers' ? null : 'layers');
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            activeSidebarTab === 'layers'
              ? 'bg-[#00796B]/10 text-[#00796B] border border-[#00796B]/30 font-bold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Sheets & Revision Layers"
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px] font-semibold">Layers</span>
        </button>

        {/* Project Folders & Multipliers Icon */}
        <button
          onClick={() => {
            onSelectSidebarTab(activeSidebarTab === 'project' ? null : 'project');
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            activeSidebarTab === 'project'
              ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Trade Folders & Multipliers"
        >
          <FolderTree className="w-4 h-4" />
          <span className="text-[9px] font-semibold">Project</span>
        </button>

        {/* BoQ Stage Shortcut */}
        <button
          onClick={() => onSelectStage('boq')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
            currentStage === 'boq'
              ? 'bg-purple-600 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Full Bill of Quantities"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="text-[9px] font-semibold">BoQ</span>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick Tooling Buttons */}
      <div className="flex flex-col items-center gap-2 w-full px-2 mb-2">
        {/* Corner Magnet Snapping */}
        <button
          onClick={onToggleMagnet}
          title={isMagnetEnabled ? 'Snapping ON' : 'Snapping OFF'}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
            isMagnetEnabled
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          <Magnet className="w-4 h-4" />
        </button>

        {/* Loupe Magnifier */}
        <button
          onClick={onToggleMagnifier}
          title={isMagnifierEnabled ? 'Magnifier Loupe ON' : 'Magnifier Loupe OFF'}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
            isMagnifierEnabled
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
              : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Vector Scale */}
        <button
          onClick={onOpenScaleModal}
          title="Calibrate Scale (Ruler)"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
        >
          <Ruler className="w-4 h-4" />
        </button>

        {/* Executive Guide / Info */}
        <button
          onClick={onOpenExecutiveGuide}
          title="Executive Tour & Info"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
