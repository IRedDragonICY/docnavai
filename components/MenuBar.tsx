
import React, { useState } from 'react';
import { Menu, Zap, ChevronDown, Coins, HelpCircle, FileText, Settings, Layout } from 'lucide-react';
import { GEMINI_MODELS } from '../types';

interface MenuBarProps {
  onOpenClick: () => void;
  onNewClick: () => void;
  onExportClick: () => void;
  onUsageClick: () => void;
  onSettingsClick: () => void;
  onAboutClick?: () => void;
  selectedModel: string;
  estimatedCost: string;
  activeFileName?: string;
}

export const MenuBar: React.FC<MenuBarProps> = ({ 
  onOpenClick, 
  onNewClick, 
  onExportClick, 
  onUsageClick, 
  onSettingsClick,
  onAboutClick,
  selectedModel,
  estimatedCost,
  activeFileName
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const activeModelLabel = GEMINI_MODELS.find(m => m.id === selectedModel)?.label || 'Gemini';

  const MenuTrigger = ({ label, items }: { label: string, items: any[] }) => (
    <div className="relative group">
      <button 
        className="px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/10 rounded-md transition-colors"
        onClick={() => setActiveMenu(activeMenu === label ? null : label)}
      >
        {label}
      </button>
      <div className={`absolute top-full left-0 mt-1 w-48 bg-[#18181b] border border-white/10 rounded-lg shadow-xl p-1 z-50 ${activeMenu === label ? 'block' : 'hidden group-hover:block'}`}>
        {items.map((item, idx) => (
          <button 
            key={idx}
            onClick={() => { item.action?.(); setActiveMenu(null); }}
            className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-indigo-500/20 hover:text-white rounded-md flex justify-between items-center transition-colors"
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-[9px] text-slate-500 font-mono">{item.shortcut}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-9 bg-[#09090b] border-b border-white/10 flex items-center justify-between px-2 shrink-0 select-none">
      <div className="flex items-center gap-1">
        <div className="pr-3 pl-2 flex items-center gap-2">
           <div className="w-4 h-4 bg-indigo-600 rounded flex items-center justify-center shadow-sm">
              <Zap className="w-2.5 h-2.5 text-white fill-white" />
           </div>
           <span className="text-xs font-bold text-slate-200 tracking-tight">DocNav</span>
        </div>
        
        <div className="h-4 w-px bg-white/10 mx-1" />

        <MenuTrigger label="File" items={[
            { label: "New Window", action: onNewClick, shortcut: "Ctrl+N" },
            { label: "Open File...", action: onOpenClick, shortcut: "Ctrl+O" },
            { label: "Export PDF...", action: onExportClick, shortcut: "Ctrl+E" },
            { label: "Settings", action: onSettingsClick, shortcut: "Ctrl+," },
        ]} />
        
        <MenuTrigger label="View" items={[
            { label: "Zoom In", shortcut: "Ctrl++" },
            { label: "Zoom Out", shortcut: "Ctrl+-" },
            { label: "Reset View" },
        ]} />

        <MenuTrigger label="Help" items={[
            { label: "Documentation" },
            { label: "Usage & Billing", action: onUsageClick },
            { label: "About DocNav", action: onAboutClick },
        ]} />
      </div>

      {activeFileName && (
          <div className="absolute left-1/2 -translate-x-1/2 text-[11px] text-slate-400 font-medium flex items-center gap-2 opacity-70">
              <FileText className="w-3 h-3" />
              {activeFileName}
          </div>
      )}

      <div className="flex items-center gap-3 pr-2">
          <button 
            onClick={onUsageClick}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors text-[10px] text-slate-400 hover:text-emerald-400"
          >
              <Coins className="w-3 h-3" />
              <span>${estimatedCost}</span>
          </button>
          
          <div className="h-3 w-px bg-white/10" />

          <button 
             onClick={onSettingsClick}
             className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
             title="Settings"
          >
             <Settings className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-indigo-300">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>{activeModelLabel}</span>
          </div>
      </div>
    </div>
  );
};
