
import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ChevronRight, Check, Eye, Zap, Code, FileCode, Layers, ChevronDown, Bot, AlertCircle, Cpu, Loader2 } from 'lucide-react';
import { AgentLogEntry } from '../types';

interface AnalysisLoggerProps {
  logs: AgentLogEntry[];
}

export const AnalysisLogger: React.FC<AnalysisLoggerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#09090b] font-mono text-xs leading-relaxed selection:bg-indigo-500/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          <span className="font-medium text-slate-200 tracking-wide text-[11px]">AGENT TERMINAL</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>ONLINE</span>
        </div>
      </div>

      {/* Logs Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar"
      >
        {/* Empty State */}
        {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-3 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-[10px] tracking-widest uppercase">Initializing Environment...</span>
            </div>
        )}

        {logs.map((log) => (
          <LogItem key={log.id} log={log} />
        ))}
        
        <div className="h-8" /> {/* Spacer */}
      </div>
    </div>
  );
};

const LogItem: React.FC<{ log: AgentLogEntry }> = ({ log }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasOutput = !!log.output || !!log.codeBlock;
  
  // Default open specific logs
  useEffect(() => {
      if (log.type === 'ERROR') setIsOpen(true);
  }, [log.type]);

  const getIcon = () => {
    switch (log.type) {
        case 'THOUGHT': return <Eye className="w-3.5 h-3.5" />;
        case 'TOOL': return <Code className="w-3.5 h-3.5" />;
        case 'ACTION': return <Cpu className="w-3.5 h-3.5" />;
        case 'SYSTEM': return <Terminal className="w-3.5 h-3.5" />;
        case 'SUCCESS': return <Check className="w-3.5 h-3.5" />;
        case 'ERROR': return <AlertCircle className="w-3.5 h-3.5" />;
        default: return <Layers className="w-3.5 h-3.5" />;
    }
  };

  const getColorClass = () => {
    switch (log.type) {
        case 'THOUGHT': return 'text-slate-400 border-slate-800 bg-slate-900/20';
        case 'TOOL': return 'text-blue-400 border-blue-900/30 bg-blue-900/10';
        case 'ACTION': return 'text-indigo-400 border-indigo-900/30 bg-indigo-900/10';
        case 'SYSTEM': return 'text-zinc-500 border-zinc-800 bg-zinc-900/20';
        case 'SUCCESS': return 'text-emerald-400 border-emerald-900/30 bg-emerald-900/10';
        case 'ERROR': return 'text-red-400 border-red-900/30 bg-red-900/10';
        default: return 'text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="group animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className={`
        relative flex flex-col border rounded-md transition-all duration-200 overflow-hidden
        ${getColorClass()}
        ${hasOutput && isOpen ? 'bg-opacity-30' : 'bg-opacity-10 border-opacity-0 hover:bg-opacity-20'}
      `}>
        
        {/* Header Row */}
        <div 
            onClick={() => hasOutput && setIsOpen(!isOpen)}
            className={`
                flex items-center gap-3 px-3 py-2 cursor-pointer
                ${!hasOutput ? 'cursor-default' : ''}
            `}
        >
            <div className={`shrink-0 opacity-70`}>
                {getIcon()}
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-semibold text-[10px] uppercase tracking-wider opacity-60 min-w-[60px]">
                    {log.type}
                </span>
                <span className="text-[11px] truncate opacity-90">
                    {log.message}
                </span>
            </div>

            {hasOutput && (
                <div className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
            )}
        </div>

        {/* Expanded Content */}
        {hasOutput && isOpen && (
            <div className="border-t border-white/5 bg-black/20 px-3 py-3 animate-in fade-in zoom-in-95 duration-150">
                {log.codeBlock && (
                    <div className="mb-2 font-mono text-[10px] text-emerald-400/90 bg-emerald-950/30 p-2 rounded border border-emerald-900/20">
                        {log.codeBlock}
                    </div>
                )}
                {log.output && (
                    <pre className="font-mono text-[10px] text-slate-400 whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                        {log.output}
                    </pre>
                )}
            </div>
        )}
      </div>
      
      {/* Connecting line for flow visual */}
      {log.type !== 'SUCCESS' && (
         <div className="h-2 ml-[1.15rem] w-px bg-white/5" />
      )}
    </div>
  );
};
