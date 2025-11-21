
import React, { useState, useRef, useEffect } from 'react';
import { DocumentSession, AppState, GEMINI_MODELS } from '../types';
import { FileText, Trash2, Play, ChevronRight, CheckCircle2, Loader2, AlertCircle, Settings2, ChevronDown, Zap, Edit3 } from 'lucide-react';

interface BatchDashboardProps {
  sessions: DocumentSession[];
  onOpenSession: (id: string) => void;
  onRemoveSession: (id: string) => void;
  onRenameSession: (id: string, newName: string) => void;
  onUpdateModel: (sessionId: string, modelId: string) => void;
  onStartAnalysis: (sessionId: string) => void;
  onStartAll: () => void;
  globalModelId: string;
  onUpdateGlobalModel: (modelId: string) => void;
}

export const BatchDashboard: React.FC<BatchDashboardProps> = ({
  sessions,
  onOpenSession,
  onRemoveSession,
  onRenameSession,
  onUpdateModel,
  onStartAnalysis,
  onStartAll,
  globalModelId,
  onUpdateGlobalModel
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isGlobalDropdownOpen, setIsGlobalDropdownOpen] = useState(false);

  // Rename State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartRename = (id: string, currentName: string) => {
      setEditingId(id);
      setEditValue(currentName);
  };

  const handleSaveRename = (id: string) => {
      if (editValue.trim()) {
          onRenameSession(id, editValue.trim());
      }
      setEditingId(null);
  };

  const getStatusColor = (state: AppState) => {
    switch (state) {
      case AppState.IDLE: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      case AppState.ANALYZING: return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case AppState.VIEWING: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case AppState.ERROR: return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (state: AppState) => {
    switch (state) {
        case AppState.IDLE: return <div className="w-2 h-2 rounded-full bg-slate-500" />;
        case AppState.ANALYZING: return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
        case AppState.VIEWING: return <CheckCircle2 className="w-3.5 h-3.5" />;
        case AppState.ERROR: return <AlertCircle className="w-3.5 h-3.5" />;
        default: return <div className="w-2 h-2 rounded-full bg-slate-500" />;
    }
  };

  const globalModelLabel = GEMINI_MODELS.find(m => m.id === globalModelId)?.label || 'Select Model';

  return (
    <div className="w-full max-w-6xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
          <div>
              <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Batch Operations</h1>
              <p className="text-slate-400 text-sm">
                  Queueing <span className="text-white font-bold">{sessions.length}</span> documents for analysis. 
                  Configure models individually or globally before execution.
              </p>
          </div>

          <div className="flex items-center gap-3 bg-[#121214] p-1.5 rounded-xl border border-white/10 shadow-lg">
              {/* Global Model Selector */}
              <div className="relative">
                  <button 
                    onClick={() => setIsGlobalDropdownOpen(!isGlobalDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-slate-200 transition-colors min-w-[180px] justify-between"
                  >
                      <span className="truncate">{globalModelLabel}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                  
                  {isGlobalDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar ring-1 ring-white/5">
                          <div className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white/5 border-b border-white/5">
                              Apply to All Idle
                          </div>
                          {GEMINI_MODELS.map(model => (
                              <button
                                  key={model.id}
                                  onClick={() => {
                                      onUpdateGlobalModel(model.id);
                                      setIsGlobalDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-indigo-500/20 hover:text-white text-xs text-slate-300 transition-colors border-b border-white/5 last:border-0"
                              >
                                  <div className="font-bold">{model.label}</div>
                                  <div className="text-[10px] opacity-60">{model.category}</div>
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              <button 
                onClick={onStartAll}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:translate-y-0.5"
              >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  START ALL
              </button>
          </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session, index) => {
              const modelInfo = GEMINI_MODELS.find(m => m.id === session.selectedModel);
              
              return (
                  <div 
                    key={session.id}
                    className="group relative bg-[#121214] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 hover:bg-[#18181b] hover:shadow-xl"
                  >
                      <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                              <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex gap-2">
                              {session.state === AppState.IDLE && (
                                  <button 
                                    onClick={() => onStartAnalysis(session.id)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors border border-transparent hover:border-emerald-500/20"
                                    title="Run Analysis"
                                  >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                              )}
                              <button 
                                onClick={() => onRemoveSession(session.id)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
                                title="Remove"
                              >
                                  <Trash2 className="w-3.5 h-3.5" />
                              </button>
                          </div>
                      </div>

                      <div className="mb-4 h-[50px]">
                          {editingId === session.id ? (
                                <input 
                                    ref={inputRef}
                                    autoFocus
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleSaveRename(session.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveRename(session.id);
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    className="w-full bg-transparent border-b border-indigo-500 text-sm font-bold text-white py-0.5 focus:outline-none mb-0.5 placeholder-slate-600 font-sans"
                                />
                          ) : (
                                <div 
                                    onDoubleClick={() => handleStartRename(session.id, session.fileName)}
                                    className="group/title flex items-center gap-2 cursor-text w-full"
                                    title="Double click to rename"
                                >
                                    <h3 className="text-sm font-bold text-slate-100 truncate mb-1 group-hover/title:text-indigo-300 transition-colors select-none">
                                        {session.fileName}
                                    </h3>
                                    <Edit3 className="w-3 h-3 text-slate-600 opacity-0 group-hover/title:opacity-100 transition-opacity -translate-x-2 group-hover/title:translate-x-0" />
                                </div>
                          )}

                          <div className="flex items-center gap-2">
                              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(session.state)}`}>
                                  {getStatusIcon(session.state)}
                                  {session.state}
                              </span>
                              <span className="text-[10px] text-slate-600 font-mono">
                                  {(session.file ? (session.file.size / 1024 / 1024).toFixed(2) : '0.00')} MB
                              </span>
                          </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                          {/* Model Override Dropdown */}
                          <div className="relative flex-1">
                              <button 
                                onClick={() => setOpenDropdownId(openDropdownId === session.id ? null : session.id)}
                                disabled={session.state !== AppState.IDLE}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors border ${
                                    session.state !== AppState.IDLE ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/5 text-slate-400' : 'bg-black/20 border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
                                }`}
                              >
                                  <span className="truncate">{modelInfo?.label}</span>
                                  <Settings2 className="w-3 h-3" />
                              </button>

                              {openDropdownId === session.id && session.state === AppState.IDLE && (
                                  <div className="absolute bottom-full left-0 mb-2 w-full bg-[#18181b] border border-white/10 rounded-lg shadow-xl z-20 max-h-[200px] overflow-y-auto custom-scrollbar">
                                      {GEMINI_MODELS.map(model => (
                                          <button
                                              key={model.id}
                                              onClick={() => {
                                                  onUpdateModel(session.id, model.id);
                                                  setOpenDropdownId(null);
                                              }}
                                              className={`w-full text-left px-3 py-2 hover:bg-indigo-500/20 hover:text-white text-[10px] transition-colors border-b border-white/5 last:border-0 ${model.id === session.selectedModel ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-400'}`}
                                          >
                                              {model.label}
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>

                          <button 
                            onClick={() => onOpenSession(session.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors border border-white/5 hover:border-white/10"
                          >
                              Open <ChevronRight className="w-3 h-3" />
                          </button>
                      </div>
                      
                      {/* Progress Bar if Analyzing */}
                      {session.state === AppState.ANALYZING && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/20">
                              <div className="h-full bg-indigo-500 animate-pulse w-2/3" /> 
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
    </div>
  );
};
