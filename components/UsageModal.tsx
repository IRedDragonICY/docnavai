
import React, { useMemo } from 'react';
import { X, Info, ChevronDown, Zap, BrainCircuit, Activity, Radio, Cpu, Sparkles, Hash, BarChart3, Server, Layers } from 'lucide-react';
import { GlobalUsage, GEMINI_MODELS, TokenUsage, ModelInfo } from '../types';

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUsage: TokenUsage;
  lifetimeUsage: GlobalUsage;
  activeModelId: string;
}

const getCategoryStyle = (category: string) => {
  switch(category) {
    case 'Reasoning': return { color: 'bg-gradient-to-r from-indigo-500 to-purple-500', icon: BrainCircuit, border: 'border-purple-500/30' };
    case 'Balanced': return { color: 'bg-blue-500', icon: Activity, border: 'border-blue-500/30' };
    case 'Fast': return { color: 'bg-amber-400', icon: Zap, border: 'border-amber-500/30' };
    case 'Live API': return { color: 'bg-red-500', icon: Radio, border: 'border-red-500/30' };
    case 'Experimental': return { color: 'bg-emerald-500', icon: Sparkles, border: 'border-emerald-500/30' };
    default: return { color: 'bg-slate-500', icon: Cpu, border: 'border-slate-500/30' };
  }
};

const getModelLimit = (model: ModelInfo) => {
    if (model.id.includes('flash') || model.id.includes('lite')) return 500_000_000; 
    return 50_000_000; 
};

export const UsageModal: React.FC<UsageModalProps> = ({ 
  isOpen, 
  onClose, 
  sessionUsage,
  lifetimeUsage,
  activeModelId
}) => {
  
  const mergedUsage = useMemo(() => {
    const usageCopy: GlobalUsage = JSON.parse(JSON.stringify(lifetimeUsage));
    
    if (sessionUsage.totalTokens > 0 && activeModelId) {
        const current = usageCopy[activeModelId] || { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, totalCalls: 0 };
        usageCopy[activeModelId] = {
            promptTokens: current.promptTokens + sessionUsage.promptTokens,
            candidatesTokens: current.candidatesTokens + sessionUsage.candidatesTokens,
            totalTokens: current.totalTokens + sessionUsage.totalTokens,
            totalCalls: current.totalCalls + sessionUsage.totalCalls
        };
    }
    return usageCopy;
  }, [lifetimeUsage, sessionUsage, activeModelId]);

  if (!isOpen) return null;

  const calculateCost = (usage: TokenUsage, modelId: string) => {
      const modelInfo = GEMINI_MODELS.find(m => m.id === modelId);
      const inputPrice = modelInfo?.pricing.input || 0.10;
      const inputHighPrice = modelInfo?.pricing.inputHigh || inputPrice;
      const outputPrice = modelInfo?.pricing.output || 0.40;

      let inputCost = 0;
      if (usage.promptTokens <= 200000) {
          inputCost = (usage.promptTokens / 1000000) * inputPrice;
      } else {
          inputCost = (200000 / 1000000) * inputPrice + ((usage.promptTokens - 200000) / 1000000) * inputHighPrice;
      }

      const outputCost = (usage.candidatesTokens / 1000000) * outputPrice;

      return (inputCost + outputCost).toFixed(4);
  };

  const formatTokens = (num: number) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
  };

  const getCycleDates = () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      return `${fmt(start)} - ${fmt(end)}`;
  };

  const usageEntries = Object.entries(mergedUsage).map(([modelId, usage]) => {
      const info = GEMINI_MODELS.find(m => m.id === modelId);
      return {
          modelId,
          modelName: info?.label || modelId,
          category: info?.category || 'Unknown',
          usage,
          cost: calculateCost(usage, modelId)
      };
  }).filter(e => e.usage.totalTokens > 0).sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));

  const totalCost = usageEntries.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toFixed(2);
  const totalCalls = usageEntries.reduce((acc, curr) => acc + curr.usage.totalCalls, 0);
  const totalTokens = usageEntries.reduce((acc, curr) => acc + curr.usage.totalTokens, 0);

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 font-sans"
        onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 shrink-0 bg-[#09090b]/50 backdrop-blur-sm relative z-10">
             <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Usage & Billing
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Enterprise Plan</span>
                    <span className="text-slate-700">•</span>
                    <span>{getCycleDates()}</span>
                </div>
             </div>
             <button 
                onClick={onClose} 
                className="text-slate-500 hover:text-white transition-all rounded-full p-2 hover:bg-white/10 hover:rotate-90 duration-300"
             >
                 <X className="w-5 h-5" />
             </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 relative z-10">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cost Card */}
                <div className="bg-[#121214] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-400" /> Est. Cost
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-medium text-slate-400">US$</span>
                            <span className="text-4xl font-bold text-white tracking-tight text-shadow-sm">{totalCost}</span>
                        </div>
                    </div>
                </div>

                {/* API Calls Card - FEATURED */}
                <div className="bg-[#121214] p-6 rounded-2xl border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-500 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 blur-[40px] rounded-full pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="text-emerald-400/80 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Server className="w-4 h-4" /> Total Requests
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-white tracking-tight font-mono">{totalCalls.toLocaleString()}</span>
                            <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">API Calls</span>
                        </div>
                    </div>
                </div>

                {/* Tokens Card */}
                <div className="bg-[#121214] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-purple-400" /> Total Volume
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-white tracking-tight font-mono">{formatTokens(totalTokens)}</span>
                            <span className="text-sm text-slate-500 font-medium">tokens</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown Table */}
            <div className="space-y-6 pb-8">
                <div className="flex justify-between items-center">
                     <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-400" /> Resource Breakdown
                     </h3>
                     <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-[#121214] border border-white/10 rounded-lg text-[10px] font-medium text-slate-300 flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors">
                             Current Session <ChevronDown className="w-3 h-3 text-slate-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-2xl overflow-hidden">
                     <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white/[0.01]">
                         <div className="col-span-2">Model Architecture</div>
                         <div className="col-span-1">Category</div>
                         <div className="col-span-1 text-right text-emerald-500/80">API Calls</div>
                         <div className="col-span-1 text-right">Input Tokens</div>
                         <div className="col-span-1 text-right">Output Tokens</div>
                         <div className="col-span-1 text-right">Cost</div>
                     </div>

                     <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                         {usageEntries.length === 0 && (
                             <div className="px-6 py-16 text-center flex flex-col items-center gap-3 opacity-40">
                                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                     <Info className="w-6 h-6 text-slate-500" />
                                 </div>
                                 <div className="text-sm text-slate-400 font-medium">No utilization recorded</div>
                             </div>
                         )}
                         {usageEntries.map((entry) => (
                             <div key={entry.modelId} className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-white/5 text-xs hover:bg-white/[0.02] transition-colors group">
                                 <div className="col-span-2 text-slate-200 font-medium flex items-center gap-2">
                                     {entry.modelName}
                                     {entry.category === 'Reasoning' && <span className="px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] border border-purple-500/20 font-mono">PRO</span>}
                                 </div>
                                 <div className="col-span-1">
                                     <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 border border-white/5 font-medium">
                                         {entry.category}
                                     </span>
                                 </div>
                                 <div className="col-span-1 text-right text-emerald-400 font-mono font-bold bg-emerald-500/5 rounded px-1 inline-flex items-center justify-end">
                                     {entry.usage.totalCalls.toLocaleString()}
                                 </div>
                                 <div className="col-span-1 text-right text-slate-400 font-mono">
                                     {formatTokens(entry.usage.promptTokens)}
                                 </div>
                                 <div className="col-span-1 text-right text-slate-400 font-mono">
                                     {formatTokens(entry.usage.candidatesTokens)}
                                 </div>
                                 <div className="col-span-1 text-right text-indigo-300 font-medium font-mono">
                                     US${entry.cost}
                                 </div>
                             </div>
                         ))}
                     </div>
                     
                     {/* Footer Row */}
                     <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-white/[0.02] text-xs border-t border-white/5 font-bold">
                         <div className="col-span-3 text-slate-400 uppercase tracking-wider text-[10px]">Grand Totals</div>
                         <div className="col-span-1 text-right text-emerald-400 font-mono">{totalCalls.toLocaleString()}</div>
                         <div className="col-span-2 text-right text-slate-400 font-mono text-[10px] uppercase tracking-wider pt-0.5">{formatTokens(totalTokens)} Tks</div>
                         <div className="col-span-1 text-right text-indigo-400 font-mono">US${totalCost}</div>
                     </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
