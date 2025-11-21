
import React from 'react';
import { X, Zap, ShieldCheck, Globe, Layers, Github, ExternalLink } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 font-sans"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/5 group perspective-1000"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0c0c0e] to-[#0c0c0e] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-indigo-500/10 blur-[80px] pointer-events-none" />

        <div className="relative z-10 p-8 flex flex-col items-center text-center">
            
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-5 right-5 text-slate-500 hover:text-white transition-all p-2 hover:bg-white/5 rounded-full group/close z-20"
            >
                <X className="w-5 h-5 group-hover/close:rotate-90 transition-transform duration-300" />
            </button>

            {/* Logo */}
            <div className="mb-8 relative group/logo mt-4">
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full group-hover/logo:opacity-40 transition-opacity duration-500 animate-pulse"></div>
                <div className="w-24 h-24 bg-gradient-to-b from-[#18181b] to-[#09090b] border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl relative transform transition-all duration-500 group-hover/logo:scale-105 group-hover/logo:border-indigo-500/30 group-hover/logo:shadow-indigo-500/20">
                    <Zap className="w-10 h-10 text-indigo-400 fill-indigo-400/20" strokeWidth={1.5} />
                </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                DocNav <span className="text-indigo-400">AI</span>
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 mb-8 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">v2.5.0 • Enterprise</span>
            </div>

            {/* Description */}
            <p className="text-slate-400 leading-relaxed max-w-xs mb-10 text-sm font-light tracking-wide">
                An advanced agentic interface designed for high-precision document analysis. 
                <br/>
                <span className="text-indigo-300 font-semibold glow-text">Powered by AI Gemini</span>
            </p>

            {/* Creator Link */}
            <a 
                href="https://github.com/IRedDragonICY/docnavai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-3.5 bg-[#18181b] hover:bg-[#202025] border border-white/10 hover:border-indigo-500/30 rounded-2xl transition-all duration-300 group/link w-full max-w-xs mb-10 relative overflow-hidden shadow-lg hover:shadow-indigo-500/10"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover/link:translate-x-[200%] transition-transform duration-1000" />
                <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0 text-white group-hover/link:scale-110 transition-transform duration-300 shadow-inner">
                   <Github className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Created By</div>
                    <div className="text-sm text-white font-bold flex items-center gap-1 group-hover/link:text-indigo-300 transition-colors">
                        IRedDragonICY <span className="text-slate-600 font-light">/</span> docnavai
                    </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-600 group-hover/link:text-indigo-400 transition-colors" />
            </a>

            {/* Features Footer */}
            <div className="flex items-center justify-center gap-8 text-[10px] font-bold text-slate-600 uppercase tracking-wider w-full border-t border-white/5 pt-6">
                <div className="flex items-center gap-2 hover:text-emerald-400 transition-colors cursor-help">
                    <ShieldCheck className="w-3.5 h-3.5" /> Secure
                </div>
                <div className="flex items-center gap-2 hover:text-indigo-400 transition-colors cursor-help">
                    <Globe className="w-3.5 h-3.5" /> Scalable
                </div>
                <div className="flex items-center gap-2 hover:text-purple-400 transition-colors cursor-help">
                    <Layers className="w-3.5 h-3.5" /> Modular
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
