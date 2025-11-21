
import React from 'react';
import { X, Zap, ShieldCheck, Globe, Cpu, Code, Layers, Box, Gem } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/5 group"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Background Grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
                 backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                 backgroundSize: '40px 40px',
                 maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
             }} 
        />
        
        {/* Glowing Background Orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 p-10 flex flex-col items-center text-center">
            
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Logo / Icon */}
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                <div className="w-20 h-20 bg-[#121214] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl relative transform transition-transform group-hover:scale-105 duration-500">
                    <Zap className="w-10 h-10 text-indigo-400 fill-indigo-400/20" strokeWidth={1.5} />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                DocNav <span className="text-indigo-400">AI</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide uppercase opacity-80 mb-8">
                Universal Document Navigator v2.5.0
            </p>

            <p className="text-slate-300 leading-relaxed max-w-md mb-10 text-sm">
                An advanced agentic interface designed for high-precision document analysis. 
                Powered by <span className="text-indigo-300 font-semibold">Gemini 2.5</span> multi-modal reasoning 
                to transform static PDFs into interactive, intelligent data structures.
            </p>

            {/* Tech Stack Grid */}
            <div className="grid grid-cols-3 gap-4 w-full mb-10">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/10 transition-colors group/item">
                    <Gem className="w-5 h-5 text-purple-400 group-hover/item:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Gemini Pro</span>
                    <span className="text-[10px] text-slate-500">Reasoning Engine</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/10 transition-colors group/item">
                    <Code className="w-5 h-5 text-blue-400 group-hover/item:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">React 19</span>
                    <span className="text-[10px] text-slate-500">Core Framework</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/10 transition-colors group/item">
                    <Box className="w-5 h-5 text-emerald-400 group-hover/item:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">PDF.js</span>
                    <span className="text-[10px] text-slate-500">Vector Rendering</span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center gap-3 w-full border-t border-white/5 pt-8">
                <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                        <ShieldCheck className="w-3.5 h-3.5" /> Privacy First
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                        <Globe className="w-3.5 h-3.5" /> Enterprise Ready
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                        <Layers className="w-3.5 h-3.5" /> Batch Processing
                    </span>
                </div>
                <div className="text-[10px] text-slate-600 mt-2 font-mono">
                    © 2025 DocNav AI Systems. All rights reserved.
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
