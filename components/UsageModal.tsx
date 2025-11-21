
import React, { useMemo } from 'react';
import { X, Info, ChevronDown, ExternalLink, Zap, BrainCircuit, Activity, Radio, Cpu, Sparkles, Hash, BarChart3 } from 'lucide-react';
import { GlobalUsage, GEMINI_MODELS, TokenUsage, ModelInfo } from '../types';

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUsage: TokenUsage;
  lifetimeUsage: GlobalUsage;
  activeModelId: string;
}

// Helper to determine visual style per category
const getCategoryStyle = (category: string) => {
  switch(category) {
    case 'Reasoning': return { color: 'bg-gradient-to-r from-indigo-500 to-purple-500', icon: BrainCircuit };
    case 'Balanced': return { color: 'bg-blue-500', icon: Activity };
    case 'Fast': return { color: 'bg-yellow-400', icon: Zap };
    case 'Live API': return { color: 'bg-red-500', icon: Radio };
    case 'Experimental': return { color: 'bg-emerald-500', icon: Sparkles };
    default: return { color: 'bg-slate-500', icon: Cpu };
  }
};

// Mock limits definition for the "Pro Student Plan"
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans"
        onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-[#0c0c0e] border-b border-white/5 shrink-0">
             <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-white tracking-tight">Usage & Billing</h2>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Enterprise Plan</span>
                    <span>•</span>
                    <span>{getCycleDates()}</span>
                </div>
             </div>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors rounded-full p-2 hover:bg-white/5">
                 <X className="w-5 h-5" />
             </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 bg-[#0c0c0e]">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cost Card */}
                <div className="bg-[#121214] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Activity className="w-3 h-3 text-indigo-400" /> Current Cost
                        </div>
                        <div className="text-3xl font-bold text-white tracking-tight">
                            US${totalCost}
                        </div>
                    </div>
                </div>

                {/* API Calls Card */}
                <div className="bg-[#121214] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Hash className="w-3 h-3 text-emerald-400" /> Total Requests
                        </div>
                        <div className="text-3xl font-bold text-white tracking-tight font-mono">
                            {totalCalls.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Tokens Card */}
                <div className="bg-[#121214] p-5 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <BarChart3 className="w-3 h-3 text-purple-400" /> Volume Consumed
                        </div>
                        <div className="text-3xl font-bold text-white tracking-tight font-mono">
                            {formatTokens(totalTokens)} <span className="text-sm text-slate-500 font-sans font-normal">tokens</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dynamic Included Usage Section */}
            <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Included Quota Usage
                </h3>
                
                <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-6 py-3 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Allocation</span>
                    </div>
                    
                    <div className="p-6 space-y-6">
                         {GEMINI_MODELS.map((model) => {
                             const usage = mergedUsage[model.id]?.totalTokens || 0;
                             const limit = getModelLimit(model);
                             const percent = Math.min(100, (usage / limit) * 100);
                             const { color, icon: Icon } = getCategoryStyle(model.category);
                             
                             let statusText = "Active";
                             let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                             
                             if (limit >= 500_000_000 && usage < limit) {
                                 statusText = "Free Tier";
                                 statusColor = "text-slate-300 bg-slate-500/10 border-slate-500/20";
                             }
                             if (percent >= 100) {
                                 statusText = "Overage";
                                 statusColor = "text-red-400 bg-red-500/10 border-red-500/20";
                             }
                             
                             const isActiveRow = activeModelId === model.id && sessionUsage.totalTokens > 0;

                             return (
                                 <div key={model.id} className={`flex items-center justify-between text-sm group ${isActiveRow ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}>
                                     <div className="text-slate-400 w-64 font-medium flex flex-col">
                                        <span className={`flex items-center gap-2 ${isActiveRow ? 'text-indigo-300' : 'text-slate-300'}`}>
                                            <Icon className={`w-3.5 h-3.5 ${isActiveRow ? 'animate-pulse text-indigo-400' : 'opacity-70'}`} />
                                            {model.label}
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-mono pl-5.5 capitalize">{model.category} Model</span>
                                     </div>
                                     <div className="flex-1 mx-8 h-1.5 bg-slate-800/50 rounded-full overflow-hidden relative">
                                          <div 
                                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${color} ${isActiveRow ? 'animate-pulse' : ''}`}
                                            style={{ width: `${percent}%` }}
                                          />
                                     </div>
                                     <div className="flex items-center gap-8 min-w-[200px] justify-end">
                                         <div className="text-slate-200 font-mono flex items-center gap-2 text-xs">
                                             <span className={isActiveRow ? 'text-white font-bold' : ''}>{formatTokens(usage)}</span> 
                                             <span className="text-slate-600">/</span> 
                                             {formatTokens(limit)}
                                         </div>
                                         <div className="text-right min-w-[80px]">
                                             <span className={`font-bold text-[9px] px-2 py-0.5 rounded border uppercase tracking-wide ${statusColor}`}>
                                                 {statusText}
                                             </span>
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown Table */}
            <div className="space-y-5">
                <div className="flex justify-between items-center">
                     <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-400" /> Detailed Breakdown
                     </h3>
                     <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-[#121214] border border-white/10 rounded-md text-xs text-slate-300 flex items-center gap-2 cursor-pointer hover:border-white/20 transition-colors">
                             Last 30 Days <ChevronDown className="w-3 h-3 text-slate-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden shadow-sm">
                     <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white/[0.01]">
                         <div className="col-span-2">Model</div>
                         <div className="col-span-1">Category</div>
                         <div className="col-span-1 text-right">Requests</div>
                         <div className="col-span-1 text-right">Prompt</div>
                         <div className="col-span-1 text-right">Output</div>
                         <div className="col-span-1 text-right">Cost</div>
                     </div>

                     <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                         {usageEntries.length === 0 && (
                             <div className="px-6 py-12 text-center flex flex-col items-center gap-2 opacity-50">
                                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                     <Info className="w-6 h-6 text-slate-600" />
                                 </div>
                                 <div className="text-sm text-slate-300 font-medium">No usage data available</div>
                                 <div className="text-xs text-slate-500">Start analyzing documents to generate metrics.</div>
                             </div>
                         )}
                         {usageEntries.map((entry) => (
                             <div key={entry.modelId} className="grid grid-cols-7 gap-4 px-6 py-3.5 border-b border-white/5 text-xs hover:bg-white/[0.02] transition-colors group">
                                 <div className="col-span-2 text-slate-300 font-medium flex items-center gap-2">
                                     {entry.modelName}
                                     {entry.category === 'Reasoning' && <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] border border-purple-500/20 font-mono">PRO</span>}
                                 </div>
                                 <div className="col-span-1">
                                     <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-slate-400 border border-white/5 font-medium capitalize">
                                         {entry.category}
                                     </span>
                                 </div>
                                 <div className="col-span-1 text-right text-white font-mono font-medium">
                                     {entry.usage.totalCalls.toLocaleString()}
                                 </div>
                                 <div className="col-span-1 text-right text-slate-400 font-mono">
                                     {formatTokens(entry.usage.promptTokens)}
                                 </div>
                                 <div className="col-span-1 text-right text-slate-400 font-mono">
                                     {formatTokens(entry.usage.candidatesTokens)}
                                 </div>
                                 <div className="col-span-1 text-right text-emerald-400 font-medium font-mono group-hover:text-emerald-300">
                                     US${entry.cost}
                                 </div>
                             </div>
                         ))}
                     </div>
                     
                     {/* Footer Row */}
                     <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-white/[0.02] text-xs border-t border-white/5 font-bold">
                         <div className="col-span-3 text-slate-400">Totals</div>
                         <div className="col-span-1 text-right text-white font-mono">{totalCalls.toLocaleString()}</div>
                         <div className="col-span-2 text-right text-slate-400 font-mono">{formatTokens(totalTokens)} Tks</div>
                         <div className="col-span-1 text-right text-emerald-400 font-mono">US${totalCost}</div>
                     </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
