
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, FileText, ShieldCheck, ChevronDown, Search, Check, Zap, BrainCircuit, Activity, Cpu, Sparkles, Layers } from 'lucide-react';
import { GEMINI_MODELS } from '../types';

interface UploadZoneProps {
  onFileSelect: (files: File[]) => void;
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  hiddenModelIds?: string[];
  isBatchMode: boolean;
  onToggleMode: (isBatch: boolean) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  onFileSelect, 
  selectedModel, 
  onModelSelect,
  hiddenModelIds = [],
  isBatchMode,
  onToggleMode
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default fallback
  const activeModel = GEMINI_MODELS.find(m => m.id === selectedModel) || GEMINI_MODELS[3]; 

  const filteredModels = GEMINI_MODELS.filter(m => 
    (m.label.toLowerCase().includes(search.toLowerCase()) || 
    m.id.toLowerCase().includes(search.toLowerCase())) &&
    !hiddenModelIds.includes(m.id)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (validFiles.length > 0) {
        onFileSelect(validFiles);
      } else {
        alert('Please upload PDF files.');
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      onFileSelect(validFiles);
    }
  }, [onFileSelect]);

  const getModelIcon = (category: string) => {
      switch(category) {
          case 'Reasoning': return <BrainCircuit className="w-4 h-4 text-purple-400" />;
          case 'Balanced': return <Activity className="w-4 h-4 text-indigo-400" />;
          case 'Fast': return <Zap className="w-4 h-4 text-yellow-400" />;
          default: return <Cpu className="w-4 h-4 text-slate-400" />;
      }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
      <style>{`
        @keyframes upload-flow {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-6px); opacity: 0; }
          51% { transform: translateY(6px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      {/* Controls Header */}
      <div className="flex items-center gap-5 relative z-50">
          
          {/* Morphing Mode Toggle */}
          <div className="relative flex items-center bg-[#09090b]/80 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-2xl ring-1 ring-white/5">
              {/* The Sliding "Pill" Background */}
              <div 
                className={`
                    absolute top-1 bottom-1 rounded-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]
                    transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                `}
                style={{
                    left: isBatchMode ? 'calc(50% + 2px)' : '4px',
                    width: 'calc(50% - 6px)'
                }}
              />

              <button 
                onClick={() => onToggleMode(false)}
                className={`
                    relative z-10 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-colors duration-300 w-[120px]
                    ${!isBatchMode ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
                `}
              >
                  <FileText className={`w-3.5 h-3.5 transition-transform duration-500 ${!isBatchMode ? 'scale-110' : 'scale-90 opacity-50'}`} />
                  SINGLE
              </button>
              <button 
                onClick={() => onToggleMode(true)}
                className={`
                    relative z-10 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-colors duration-300 w-[120px]
                    ${isBatchMode ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
                `}
              >
                  <Layers className={`w-3.5 h-3.5 transition-transform duration-500 ${isBatchMode ? 'scale-110' : 'scale-90 opacity-50'}`} />
                  BATCH
              </button>
          </div>

          {/* Model Selector */}
          <div className="relative group" ref={dropdownRef}>
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="relative flex items-center gap-4 px-6 py-2.5 bg-[#09090b]/80 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/5 transition-all shadow-2xl hover:shadow-indigo-500/20 group ring-1 ring-white/5 hover:ring-indigo-500/30 h-[46px]"
            >
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">AI Core</div>
                <div className="h-4 w-px bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2.5">
                    {getModelIcon(activeModel.category)}
                    <span className="text-sm font-semibold text-white tracking-wide">{activeModel.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 ml-2 transition-transform duration-300 ${isMenuOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>

            {isMenuOpen && (
                <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-96 bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5 z-[60]">
                    <div className="p-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                        <div className="relative group/search">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Find a model..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 max-h-[320px] custom-scrollbar p-2 space-y-1">
                        {filteredModels.length === 0 && (
                            <div className="p-8 text-center text-xs text-slate-500">No models found.</div>
                        )}
                        
                        {filteredModels.map(model => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    onModelSelect(model.id);
                                    setIsMenuOpen(false);
                                }}
                                className={`w-full flex flex-col gap-1.5 px-4 py-3 text-left hover:bg-white/5 rounded-xl transition-all group/item border border-transparent ${selectedModel === model.id ? 'bg-white/5 border-white/5 shadow-inner' : 'hover:border-white/5'}`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2.5">
                                        {getModelIcon(model.category)}
                                        <span className={`text-sm font-semibold ${selectedModel === model.id ? 'text-indigo-400' : 'text-slate-200 group-hover/item:text-white'}`}>
                                            {model.label}
                                        </span>
                                    </div>
                                    {selectedModel === model.id && <Check className="w-4 h-4 text-indigo-400" />}
                                </div>
                                <div className="text-[10px] text-slate-500 leading-relaxed pl-7 line-clamp-2 group-hover/item:text-slate-400 transition-colors">
                                    {model.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
      </div>

      {/* Holographic Upload Portal */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full relative group overflow-hidden rounded-[2.5rem] border border-dashed transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isDragging ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02] shadow-[0_0_80px_rgba(99,102,241,0.3)]' : 'border-white/10 hover:border-white/20 bg-[#0c0c0e]'}
        `}
      >
        {/* Dynamic Background Grid */}
        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" 
             style={{ 
                 backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                 backgroundSize: '40px 40px',
                 maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
             }} 
        />
        
        {/* Glowing Orb Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="relative p-16 flex flex-col items-center text-center space-y-8 z-10">
          
          {/* Morphing Icon Container */}
          <div className="relative w-24 h-24">
              <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 rounded-full"></div>
              
              <div className="w-24 h-24 rounded-3xl bg-[#18181b] flex items-center justify-center shadow-2xl shadow-black ring-1 ring-white/10 relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-2">
                 <div className="relative w-10 h-10">
                      {/* Main Document Icon - Morphs position/rotation */}
                      <FileText 
                        className={`
                            absolute inset-0 w-full h-full text-indigo-400 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                            ${isBatchMode 
                                ? 'translate-x-[-6px] translate-y-[4px] rotate-[-12deg] text-indigo-300 z-30' 
                                : 'translate-x-0 translate-y-0 rotate-0 z-30'
                            }
                        `} 
                      />
                      
                      {/* Batch Document 2 - Fans out from behind */}
                      <FileText 
                        className={`
                            absolute inset-0 w-full h-full text-purple-400 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-20
                            ${isBatchMode 
                                ? 'translate-x-[2px] translate-y-[-2px] rotate-[0deg] opacity-80 scale-95' 
                                : 'translate-x-0 translate-y-0 rotate-0 opacity-0 scale-50'
                            }
                        `} 
                      />
                      
                      {/* Batch Document 3 - Fans out further */}
                      <FileText 
                        className={`
                            absolute inset-0 w-full h-full text-emerald-400 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-10
                            ${isBatchMode 
                                ? 'translate-x-[10px] translate-y-[-8px] rotate-[12deg] opacity-60 scale-90' 
                                : 'translate-x-0 translate-y-0 rotate-0 opacity-0 scale-50'
                            }
                        `} 
                      />
                 </div>
              </div>
              
              {/* Orbit Ring Animation */}
              <div className={`
                  absolute -inset-3 border border-indigo-500/30 rounded-full transition-all duration-1000 ease-out 
                  ${isBatchMode ? 'scale-110 opacity-100 rotate-180' : 'scale-90 opacity-0 rotate-0'}
              `} />
          </div>
          
          {/* Text Container with Height Placeholder to prevent jumping */}
          <div className="h-[84px] w-full max-w-lg relative flex items-center justify-center">
             {/* Single Mode Text */}
             <div 
                className={`
                    absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${!isBatchMode ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 -translate-y-4 scale-95 blur-sm pointer-events-none'}
                `}
             >
                <h3 className="text-3xl font-medium text-white tracking-tight drop-shadow-md">
                    Initialize Document Analysis
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mt-3">
                    Drag & drop your Financial Report PDF to begin the <span className="text-indigo-400 font-mono font-bold">Agentic Workflow</span>.
                </p>
             </div>

             {/* Batch Mode Text */}
             <div 
                className={`
                    absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isBatchMode ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 translate-y-4 scale-95 blur-sm pointer-events-none'}
                `}
             >
                <h3 className="text-3xl font-medium text-white tracking-tight drop-shadow-md">
                    Initialize Batch Analysis
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mt-3">
                    Drag & drop multiple PDF files to begin the <span className="text-indigo-400 font-mono font-bold">Batch Queue</span>.
                </p>
             </div>
          </div>

          <div className="flex flex-col items-center space-y-6 pt-2">
            <label className="cursor-pointer group/btn relative px-8 py-4 bg-white text-black rounded-xl font-bold shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.25)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                multiple={isBatchMode}
                onChange={handleFileInput}
              />
              <div className="flex items-center gap-3 relative z-10">
                {/* Custom Animated Upload Icon */}
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="w-5 h-5"
                >
                    {/* Bracket - Static */}
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    
                    {/* Arrow Group - Animated on Hover */}
                    <g className="group-hover/btn:[animation:upload-flow_1s_ease-in-out_infinite]">
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                    </g>
                </svg>
                <span>{isBatchMode ? 'SELECT FILES' : 'SELECT FILE'}</span>
              </div>
            </label>
            
            <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Enterprise Grade</span>
              </div>
              <div className="w-1 h-1 bg-slate-700 rounded-full" />
              <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span>Vision Powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
