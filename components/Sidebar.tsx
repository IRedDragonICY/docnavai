
import React, { useState, useEffect } from 'react';
import { NoteReference, SectionLink, AgentLogEntry, AgentTask, GlobalUsage, ChatMessage } from '../types';
import { Search, Sparkles, MessageSquare, Layers, ChevronRight, PanelRightClose, FileSpreadsheet, Layout, List, Loader2, PauseCircle } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { Chat } from '@google/genai';

interface SidebarProps {
  notes: NoteReference[];
  onNavigate: (page: number) => void;
  sectionLinks?: SectionLink[];
  chatSession: Chat | null;
  activeFile: File | null;
  isAnalyzing: boolean;
  onStopAnalysis: () => void;
  agentLogs: AgentLogEntry[];
  agentTasks: AgentTask[];
  onClose?: () => void;
  onStartAnalysis: (file: File) => void;
  selectedModel?: string;
  onModelSelect?: (modelId: string) => void;
  globalUsage?: GlobalUsage;
  hiddenModelIds?: string[];
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  notes, 
  onNavigate, 
  sectionLinks = [],
  chatSession,
  activeFile,
  isAnalyzing,
  onStopAnalysis,
  agentLogs,
  agentTasks,
  onClose,
  onStartAnalysis,
  selectedModel,
  onModelSelect,
  globalUsage,
  hiddenModelIds = [],
  initialMessages = [],
  onMessagesUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'explorer'>('chat');
  const [search, setSearch] = useState('');
  const [prevNoteCount, setPrevNoteCount] = useState(0);
  const [hasNewNotes, setHasNewNotes] = useState(false);

  const isPaused = !isAnalyzing && agentTasks.some(t => t.status === 'running' || t.status === 'pending');

  useEffect(() => {
    if (isAnalyzing && agentLogs.length === 0) {
        setActiveTab('chat');
    }
  }, [isAnalyzing, agentLogs.length]);

  useEffect(() => {
    if (notes.length > prevNoteCount) {
        setHasNewNotes(true);
        const timer = setTimeout(() => setHasNewNotes(false), 2000);
        return () => clearTimeout(timer);
    }
    setPrevNoteCount(notes.length);
  }, [notes.length, prevNoteCount]);

  const filteredNotes = notes.filter(n => 
    n.noteNumber.toLowerCase().includes(search.toLowerCase()) || 
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  const getSectionIcon = (type: string, title: string) => {
    if (type === 'TOC' || title.toLowerCase().includes('content')) return <List className="w-3 h-3" />;
    if (type === 'STATEMENT' || title.toLowerCase().includes('keuangan')) return <FileSpreadsheet className="w-3 h-3" />;
    return <Layout className="w-3 h-3" />;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#09090b] relative overflow-hidden">
      <style>{`
        @keyframes shimmer-text {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmering-text {
          background: linear-gradient(90deg, #cbd5e1 25%, #ffffff 50%, #cbd5e1 75%);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: shimmer-text 2s linear infinite;
        }
      `}</style>

      {/* Tab Header */}
      <div className="flex items-center px-2 pt-2 gap-1 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
        <button onClick={() => setActiveTab('chat')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-wide rounded-t-lg transition-all relative ${activeTab === 'chat' ? 'bg-[#09090b] text-indigo-400 border-t border-x border-white/5 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.5)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
          <MessageSquare className="w-3.5 h-3.5" />
          <span>AGENT</span>
          {isAnalyzing && <span className="absolute right-3 top-3.5 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />}
          {isPaused && <PauseCircle className="w-3 h-3 text-yellow-500 ml-1" />}
        </button>
        
        <button onClick={() => setActiveTab('explorer')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-wide rounded-t-lg transition-all relative ${activeTab === 'explorer' ? 'bg-[#09090b] text-indigo-400 border-t border-x border-white/5 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.5)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
          <Layers className="w-3.5 h-3.5" />
          <span>EXPLORER</span>
          {notes.length > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors duration-300 ${hasNewNotes ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>{notes.length}</span>}
        </button>

        <div className="pl-1">
             <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Close Sidebar">
                <PanelRightClose className="w-4 h-4" />
             </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-[#09090b]">
        {/* Chat Tab */}
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <ChatInterface 
                chatSession={chatSession} 
                activeFile={activeFile}
                initialLogs={agentLogs}
                tasks={agentTasks}
                isAnalyzing={isAnalyzing}
                onStop={onStopAnalysis}
                onRestart={() => activeFile && onStartAnalysis(activeFile)}
                selectedModel={selectedModel}
                onModelSelect={onModelSelect}
                hiddenModelIds={hiddenModelIds}
                initialMessages={initialMessages}
                onMessagesUpdate={onMessagesUpdate}
            />
        </div>
        
        {/* Explorer Tab */}
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'explorer' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <div className="h-full overflow-y-auto custom-scrollbar flex flex-col">
                {sectionLinks.length > 0 && (
                <div className="p-4 border-b border-white/5 bg-gradient-to-r from-indigo-950/20 to-transparent">
                    <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-indigo-300 uppercase tracking-widest opacity-80">
                        <Sparkles className="w-3 h-3" />
                        Document Structure
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                    {sectionLinks.map((link, i) => (
                        <button key={i} onClick={() => onNavigate(link.page)} className="flex items-center gap-3 px-3 py-2.5 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg group transition-all border border-transparent hover:border-white/5">
                        <div className="p-1.5 bg-white/5 rounded-md group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors shadow-sm">{getSectionIcon(link.type, link.title)}</div>
                        <span className={`truncate flex-1 ${isAnalyzing ? 'shimmering-text font-medium' : ''}`}>{link.title}</span>
                        <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{link.page}</span>
                        </button>
                    ))}
                    </div>
                </div>
                )}
                <div className="sticky top-0 z-10 bg-[#09090b]/95 backdrop-blur p-3 border-b border-white/5">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#121214] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-inner" />
                    </div>
                </div>
                <div className="flex-1 p-2 space-y-1 pb-20">
                {isAnalyzing && filteredNotes.length === 0 && (
                     <div className="text-center py-12 px-6 opacity-70 flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-400 relative z-10" />
                        </div>
                        <p className="text-xs text-slate-400 shimmer-text tracking-wide">Mapping content...</p>
                     </div>
                )}
                {!isAnalyzing && filteredNotes.length === 0 && <div className="text-center py-10 px-6 opacity-50"><p className="text-xs text-slate-500">No notes found.</p></div>}
                {filteredNotes.map((note) => (
                    <button key={note.id} onClick={() => onNavigate(note.definitionPage)} className={`w-full group flex flex-col items-start p-2.5 rounded-lg hover:bg-white/5 transition-all text-left border border-transparent hover:border-white/5 animate-in fade-in slide-in-from-left-2 duration-300`}>
                        <div className="flex items-start justify-between w-full gap-2">
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">{note.noteNumber}</span>
                                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        Pg {note.definitionPage}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-300 truncate group-hover:text-white transition-colors font-medium">{note.title}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-700 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 mt-2" />
                        </div>
                    </button>
                ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
