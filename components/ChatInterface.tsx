
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, AgentLogEntry, AgentTask, GEMINI_MODELS } from '../types';
import { Send, Bot, ChevronDown, ChevronRight, Eye, Code, Cpu, CheckCircle2, CircleDashed, AlertTriangle, StopCircle, Sparkles, XCircle, Loader2, RefreshCw, Microscope, Paperclip, X, Image as ImageIcon, Zap, Activity, BrainCircuit, Maximize2, FileText, Check, Brain, Search, Terminal, Info, AlertCircle, Play } from 'lucide-react';
import { Chat } from '@google/genai';

interface ChatInterfaceProps {
  chatSession: Chat | null;
  activeFile: File | null;
  initialLogs?: AgentLogEntry[];
  tasks?: AgentTask[];
  isAnalyzing?: boolean;
  onStop?: () => void;
  onRestart?: () => void;
  selectedModel?: string;
  onModelSelect?: (modelId: string) => void;
  hiddenModelIds?: string[];
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
}

// --- RICH LOG COMPONENT ---
const RichLogItem: React.FC<{ log: AgentLogEntry; onImageClick: (img: string) => void }> = ({ log, onImageClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasContent = !!log.details || !!log.codeBlock || !!log.output || !!log.visualEvidence;

  useEffect(() => {
      if (log.type === 'ERROR' || log.type === 'WARNING') setIsOpen(true);
  }, [log.type]);

  const getIcon = () => {
      switch (log.type) {
          case 'THOUGHT': return <Brain className="w-3.5 h-3.5" strokeWidth={2.5} />;
          case 'TOOL': return <Terminal className="w-3.5 h-3.5" strokeWidth={2.5} />;
          case 'ACTION': return <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />;
          case 'SYSTEM': return <Info className="w-3.5 h-3.5" strokeWidth={2.5} />;
          case 'SUCCESS': return <Check className="w-3.5 h-3.5" strokeWidth={2.5} />;
          case 'ERROR': return <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />;
          case 'WARNING': return <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />;
          default: return <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />;
      }
  };

  const getStyle = () => {
      switch (log.type) {
          case 'THOUGHT': return 'text-purple-400 border-purple-500/10 bg-purple-500/5 hover:bg-purple-500/10';
          case 'TOOL': return 'text-blue-400 border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/10';
          case 'ACTION': return 'text-indigo-400 border-indigo-500/10 bg-indigo-500/5 hover:bg-indigo-500/10';
          case 'SYSTEM': return 'text-slate-400 border-slate-500/10 bg-slate-500/5 hover:bg-slate-500/10';
          case 'SUCCESS': return 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10';
          case 'ERROR': return 'text-red-400 border-red-500/10 bg-red-500/5 hover:bg-red-500/10';
          case 'WARNING': return 'text-yellow-400 border-yellow-500/10 bg-yellow-500/5 hover:bg-yellow-500/10';
          default: return 'text-slate-400 border-slate-500/10 bg-slate-500/5';
      }
  };

  return (
      <div className={`group rounded-lg border transition-all duration-200 overflow-hidden mb-1.5 ${getStyle()}`}>
          <div 
              onClick={() => hasContent && setIsOpen(!isOpen)}
              className={`flex items-center gap-3 px-3 py-2.5 ${hasContent ? 'cursor-pointer' : 'cursor-default'}`}
          >
              <div className="shrink-0 opacity-80">{getIcon()}</div>
              <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                  <span className="text-[10px] font-bold tracking-wider opacity-70 uppercase w-16 shrink-0">{log.type}</span>
                  <span className="text-xs font-medium truncate opacity-90 flex-1">{log.message}</span>
              </div>
              {hasContent && (
                  <div className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
              )}
          </div>

          {hasContent && isOpen && (
              <div className="border-t border-black/10 bg-black/20 px-3 py-3 space-y-3 text-xs">
                  {log.visualEvidence && (
                      <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Visual Evidence
                          </span>
                          <div 
                            className="relative w-fit group/img cursor-zoom-in rounded-md overflow-hidden border border-white/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onImageClick(`data:image/jpeg;base64,${log.visualEvidence}`);
                            }}
                          >
                              <img 
                                src={`data:image/jpeg;base64,${log.visualEvidence}`} 
                                className="max-h-32 w-auto object-contain" 
                                alt="Evidence"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                  <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                              </div>
                          </div>
                      </div>
                  )}

                  {log.details && (
                      <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">Args / Details</span>
                          <div className="font-mono text-[10px] text-slate-400 bg-black/30 p-2 rounded border border-white/5 whitespace-pre-wrap break-all">
                              {log.details}
                          </div>
                      </div>
                  )}
                  
                  {log.codeBlock && (
                      <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-1">
                              <Code className="w-3 h-3" /> Code Generated
                          </span>
                          <pre className="font-mono text-[10px] text-emerald-400/90 bg-black/50 p-2 rounded border border-emerald-500/20 overflow-x-auto custom-scrollbar">
                              {log.codeBlock}
                          </pre>
                      </div>
                  )}

                  {log.output && (
                      <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-1">
                              {log.type === 'THOUGHT' ? <BrainCircuit className="w-3 h-3" /> : <Bot className="w-3 h-3" />} 
                              {log.type === 'THOUGHT' ? 'Reasoning Process' : 'Output'}
                          </span>
                          <div className="font-mono text-[10px] text-slate-300 bg-black/30 p-2 rounded border border-white/5 whitespace-pre-wrap leading-relaxed">
                              {log.output}
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  chatSession, 
  activeFile,
  initialLogs = [],
  tasks = [],
  isAnalyzing = false,
  onStop,
  onRestart,
  selectedModel = 'gemini-2.5-flash',
  onModelSelect,
  hiddenModelIds = [],
  initialMessages = [],
  onMessagesUpdate
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(true);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stagingSearch, setStagingSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isIdle = !isAnalyzing && (initialLogs.length === 0 && messages.length === 0);

  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const activeModelInfo = GEMINI_MODELS.find(m => m.id === selectedModel) || GEMINI_MODELS[0];

  // Filter for the chat input dropdown
  const filteredModels = GEMINI_MODELS.filter(m => 
    (m.label.toLowerCase().includes(search.toLowerCase()) || 
    m.id.toLowerCase().includes(search.toLowerCase())) &&
    !hiddenModelIds.includes(m.id)
  );

  // Filter for the Staging Area
  const filteredStagingModels = GEMINI_MODELS.filter(m => 
    (m.label.toLowerCase().includes(stagingSearch.toLowerCase()) || 
    m.id.toLowerCase().includes(stagingSearch.toLowerCase())) &&
    !hiddenModelIds.includes(m.id)
  );

  useEffect(() => {
      setMessages(initialMessages);
  }, [initialMessages]);

  const updateMessages = (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessages(prev => {
          const updated = typeof newMessages === 'function' ? newMessages(prev) : newMessages;
          onMessagesUpdate?.(updated);
          return updated;
      });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, initialLogs.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsModelMenuOpen(false);
        }
    };
    if (isModelMenuOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isModelMenuOpen]);

  useEffect(() => {
     if ((isAnalyzing || initialLogs.length > 0)) {
         setMessages(prev => {
             const exists = prev.find(m => m.id === 'agent-process-log');
             if (!exists) {
                 const newMsg: ChatMessage = {
                     id: 'agent-process-log',
                     role: 'ai',
                     text: '', 
                     logs: initialLogs,
                     timestamp: Date.now()
                 };
                 if (prev.length === 0) {
                     onMessagesUpdate?.([newMsg]);
                     return [newMsg];
                 }
                 return prev;
             }
             const updated = prev.map(m => m.id === 'agent-process-log' ? { ...m, logs: initialLogs } : m);
             if (JSON.stringify(updated) !== JSON.stringify(prev)) {
                 onMessagesUpdate?.(updated);
             }
             return updated;
         });
     }
  }, [initialLogs, isAnalyzing]);

  const getModelIcon = (category: string) => {
    switch(category) {
        case 'Reasoning': return <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />;
        case 'Balanced': return <Activity className="w-3.5 h-3.5 text-indigo-400" />;
        case 'Fast': return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
        default: return <Cpu className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
      switch(category) {
          case 'Reasoning': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
          case 'Balanced': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
          case 'Fast': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
          case 'Experimental': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          case 'Live API': return 'text-red-400 bg-red-500/10 border-red-500/20';
          default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || !chatSession || isSending) return;
    
    const userText = input;
    const currentAttachment = attachment;
    setInput('');
    setAttachment(null);
    setIsSending(true);

    const userMsgId = Math.random().toString(36);
    updateMessages(prev => [...prev, {
        id: userMsgId,
        role: 'user',
        text: userText,
        timestamp: Date.now(),
        attachment: currentAttachment ? {
            type: 'image',
            url: URL.createObjectURL(currentAttachment),
            file: currentAttachment
        } : undefined
    }]);

    try {
        const botMsgId = Math.random().toString(36);
        updateMessages(prev => [...prev, {
            id: botMsgId,
            role: 'ai',
            text: '',
            thoughts: '',
            isThinking: true,
            timestamp: Date.now()
        }]);

        const result = await chatSession.sendMessageStream({ message: userText });
        let accumulatedText = "";
        let accumulatedThoughts = "";

        for await (const chunk of result) {
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.thought) accumulatedThoughts += part.text;
                if (part.text) accumulatedText += part.text;
            }
            updateMessages(prev => prev.map(m => 
                m.id === botMsgId ? { 
                    ...m, 
                    text: accumulatedText, 
                    thoughts: accumulatedThoughts,
                    isThinking: accumulatedThoughts.length > 0 && accumulatedText.length === 0
                } : m
            ));
        }
        updateMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isThinking: false } : m));
    } catch (e) {
        updateMessages(prev => [...prev, {
            id: Math.random().toString(36),
            role: 'system',
            text: "Error: Failed to send message.",
            timestamp: Date.now()
        }]);
    } finally {
        setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.type.startsWith('image/')) setAttachment(file);
    }
  };

  // --- MISSION CONTROL (STAGING UI) ---
  if (isIdle) {
      const showScroll = filteredStagingModels.length > 3 || stagingSearch.length > 0;
      
      return (
          <div className="h-full bg-[#09090b] relative flex flex-col p-6 overflow-y-auto custom-scrollbar">
              <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   
                   {/* File Card */}
                   <div className="w-full bg-[#121214] border border-white/10 rounded-xl p-4 flex items-center gap-4 shadow-lg">
                       <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                           <FileText className="w-6 h-6" />
                       </div>
                       <div className="min-w-0 flex-1">
                           <h3 className="text-sm font-bold text-slate-200 truncate">{activeFile?.name}</h3>
                           <p className="text-xs text-slate-500 font-mono mt-0.5">{(activeFile?.size ? (activeFile.size / 1024 / 1024).toFixed(2) : '0.00')} MB</p>
                       </div>
                       <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                           Ready
                       </div>
                   </div>

                   {/* Model Selector (Staging Area) */}
                   <div className="w-full space-y-3">
                       <div className="flex items-center justify-between px-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select AI Model</label>
                            <div className="relative group">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={stagingSearch}
                                    onChange={(e) => setStagingSearch(e.target.value)}
                                    className="w-28 bg-black/20 border border-white/10 rounded-full py-1 pl-7 pr-2 text-[10px] text-white placeholder-slate-600 focus:w-40 focus:bg-black/40 focus:border-indigo-500/50 focus:outline-none transition-all"
                                />
                            </div>
                       </div>

                       <div className={`grid grid-cols-1 gap-2 transition-all duration-300 ${showScroll ? 'max-h-[240px] overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                           {filteredStagingModels.length === 0 && (
                               <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                                   No models found matching "{stagingSearch}"
                               </div>
                           )}
                           
                           {filteredStagingModels.slice(0, showScroll ? undefined : 3).map(model => (
                               <button
                                   key={model.id}
                                   onClick={() => onModelSelect?.(model.id)}
                                   className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                                       selectedModel === model.id 
                                       ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                                       : 'bg-[#121214] border-white/5 hover:bg-white/5 hover:border-white/10'
                                   }`}
                               >
                                   <div className={`p-2 rounded-lg transition-colors ${selectedModel === model.id ? 'bg-indigo-500 text-white' : 'bg-black/40 text-slate-400 group-hover:text-slate-200'}`}>
                                        {getModelIcon(model.category)}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className={`text-xs font-bold truncate ${selectedModel === model.id ? 'text-indigo-300' : 'text-slate-300'}`}>{model.label}</div>
                                       <div className="text-[10px] text-slate-500 line-clamp-1">{model.description}</div>
                                   </div>
                                   {selectedModel === model.id && <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                               </button>
                           ))}
                       </div>
                       
                       {!showScroll && filteredStagingModels.length > 3 && (
                           <button onClick={() => setStagingSearch(' ')} className="text-[10px] text-indigo-400 hover:text-indigo-300 w-full text-center mt-1 underline underline-offset-2">
                               View all {filteredStagingModels.length} models
                           </button>
                       )}
                   </div>

                   {/* Start Button */}
                   <button 
                        onClick={onRestart} 
                        className="w-full group relative overflow-hidden rounded-xl bg-indigo-600 p-4 transition-all hover:bg-indigo-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:translate-y-0 mt-2"
                   >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                        <div className="flex items-center justify-center gap-3 relative z-10">
                            <Play className="w-5 h-5 text-white fill-white" />
                            <span className="text-sm font-bold text-white tracking-wide">INITIALIZE AGENT</span>
                        </div>
                   </button>

                   <div className="text-[10px] text-slate-600 text-center max-w-[200px] leading-relaxed">
                       The agent will map the document structure, index notes, and verify content using vision.
                   </div>
              </div>

              {/* Model Menu Overlay for Chat Input is handled by the component main render */}
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b] relative font-sans">
      
      {/* Full Screen Image Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
            <div className="h-14 flex items-center justify-end px-6 shrink-0">
                <button 
                    onClick={() => setPreviewImage(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                <img 
                    src={previewImage} 
                    alt="Full Screen Preview" 
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                />
            </div>
        </div>
      )}

      {/* Task Board Header */}
      {(tasks.length > 0 || isAnalyzing) && (
        <div className="border-b border-white/10 bg-[#121214] shrink-0 z-20">
            <div className="flex items-center justify-between px-4 py-3">
                <div 
                    onClick={() => setIsTasksOpen(!isTasksOpen)}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                        isAnalyzing ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 
                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                            Agent Plan
                            {isAnalyzing && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500 rounded text-white normal-case tracking-normal">Live</span>}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 group-hover:text-slate-300 transition-colors">
                            {completedTasks} of {totalTasks} tasks completed
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                     <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                         />
                     </div>
                     <button onClick={() => setIsTasksOpen(!isTasksOpen)}>
                         <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isTasksOpen ? 'rotate-180' : ''}`} />
                     </button>
                </div>
            </div>

            {isTasksOpen && (
                <div className="border-t border-white/5 max-h-[30vh] overflow-y-auto custom-scrollbar bg-black/20 p-1">
                    {tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-md hover:bg-white/5 transition-colors group">
                             <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                                task.status === 'verified' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 
                                task.status === 'completed' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' :
                                task.status === 'running' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 
                                task.status === 'failed' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                'bg-slate-800 border-slate-700 text-slate-600'
                            }`}>
                                {task.status === 'verified' ? <Microscope className="w-2 h-2" /> :
                                 task.status === 'completed' ? <CheckCircle2 className="w-2 h-2" /> :
                                 task.status === 'running' ? <Loader2 className="w-2 h-2 animate-spin" /> :
                                 task.status === 'failed' ? <XCircle className="w-2 h-2" /> :
                                 <CircleDashed className="w-2 h-2" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${
                                        task.status === 'running' ? 'text-white' : 
                                        task.status === 'completed' || task.status === 'verified' ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                        {task.label}
                                    </span>
                                    {task.status === 'running' && (
                                        <span className="text-[9px] text-indigo-400 animate-pulse font-mono">Processing...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {msg.role === 'user' && (
                <div className="self-end max-w-[85%] flex flex-col items-end gap-1">
                    {msg.attachment && (
                        <img src={msg.attachment.url} alt="attachment" className="max-h-40 rounded-lg border border-white/10 mb-1" />
                    )}
                    <div className="bg-[#27272a] text-white px-4 py-2.5 rounded-2xl rounded-tr-none border border-white/5 shadow-sm text-sm">
                        {msg.text}
                    </div>
                </div>
            )}
            {msg.role === 'ai' && (
                <div className="self-start w-full max-w-full sm:max-w-[95%] text-sm group">
                     {/* RICH LOGS SECTION */}
                     {msg.logs && msg.logs.length > 0 && (
                         <div className="mb-4 space-y-1.5 relative pl-2">
                             <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5 -z-10" />
                             {msg.logs.map(log => (
                                <RichLogItem 
                                    key={log.id} 
                                    log={log} 
                                    onImageClick={(img) => setPreviewImage(img)}
                                />
                             ))}
                         </div>
                     )}
                     
                     {/* Thinking Process */}
                     {msg.thoughts && (
                         <div className="mb-3">
                             <details className="group/thought" open={msg.isThinking}>
                                 <summary className="list-none cursor-pointer select-none">
                                     <div className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors bg-white/5 px-3 py-2 rounded-md w-fit">
                                         {msg.isThinking ? <BrainCircuit className="w-4 h-4 animate-pulse text-indigo-400" /> : <Brain className="w-4 h-4" />}
                                         <span className="text-xs font-medium uppercase tracking-wide">Thinking Process</span>
                                         <ChevronDown className="w-3 h-3 group-open/thought:rotate-180 transition-transform" />
                                     </div>
                                 </summary>
                                 <div className="mt-2 pl-3 border-l-2 border-white/10 ml-2">
                                     <div className="text-slate-400 font-mono text-xs whitespace-pre-wrap bg-black/20 p-3 rounded-r-md">
                                         {msg.thoughts}
                                     </div>
                                 </div>
                             </details>
                         </div>
                     )}

                     {/* Final Response */}
                     {msg.text && (
                         <div className="text-slate-300 leading-relaxed whitespace-pre-wrap pl-1">
                             {msg.text}
                         </div>
                     )}
                     
                     {msg.isThinking && !msg.thoughts && (
                         <div className="flex items-center gap-2 text-slate-500 italic text-xs mt-2 px-1">
                             <Sparkles className="w-3 h-3 animate-pulse" />
                             Generating...
                         </div>
                     )}
                </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#09090b] border-t border-white/10 shrink-0 z-30">
         <div className="max-w-3xl mx-auto relative bg-[#18181b] border border-white/10 rounded-xl shadow-2xl ring-1 ring-white/5 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/30 transition-all">
             
             {attachment && (
                 <div className="absolute -top-14 left-0 p-2 bg-[#18181b] border border-white/10 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                     <img src={URL.createObjectURL(attachment)} alt="preview" className="h-8 w-8 object-cover rounded" />
                     <span className="text-xs text-slate-300 max-w-[100px] truncate">{attachment.name}</span>
                     <button onClick={() => setAttachment(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
                 </div>
             )}

             <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder={isAnalyzing ? "Agent is running tasks..." : "Ask or Type / to add content..."}
                disabled={isAnalyzing}
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 px-4 py-3 focus:outline-none min-h-[48px] max-h-[200px] resize-none custom-scrollbar"
                style={{ height: 'auto' }}
                rows={1}
             />

             <div className="flex items-center justify-between px-2 pb-2">
                 <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => !isAnalyzing && setIsModelMenuOpen(!isModelMenuOpen)}
                        disabled={isAnalyzing}
                        className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border
                            ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}
                            ${getCategoryColor(activeModelInfo.category)}
                        `}
                    >
                        {getModelIcon(activeModelInfo.category)}
                        <span>{activeModelInfo.label}</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                    </button>

                    {isModelMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#0c0c0e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 flex flex-col ring-1 ring-white/5">
                            <div className="p-3 border-b border-white/5 bg-[#121214]">
                                <div className="relative group/search">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Find a model..." 
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                                {filteredModels.map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            onModelSelect?.(model.id);
                                            setIsModelMenuOpen(false);
                                        }}
                                        className={`w-full flex flex-col gap-1 px-3 py-2.5 text-left hover:bg-white/5 rounded-lg transition-all group border border-transparent ${selectedModel === model.id ? 'bg-white/5 border-white/5 shadow-inner' : 'hover:border-white/5'}`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                {getModelIcon(model.category)}
                                                <span className={`text-xs font-semibold ${selectedModel === model.id ? 'text-indigo-400' : 'text-slate-200 group-hover:text-white'}`}>
                                                    {model.label}
                                                </span>
                                            </div>
                                            {selectedModel === model.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                        </div>
                                        <div className="text-[10px] text-slate-500 leading-relaxed pl-5.5 line-clamp-1 group-hover:text-slate-400 transition-colors">
                                            {model.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="flex items-center gap-2">
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileSelect}
                     />
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzing}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                     >
                         <ImageIcon className="w-4 h-4" />
                     </button>

                     {isAnalyzing ? (
                        <button 
                            onClick={onStop}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md text-xs font-medium transition-colors border border-red-500/20"
                        >
                            <StopCircle className="w-3.5 h-3.5" />
                            <span>Stop</span>
                        </button>
                     ) : (
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() && !attachment}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:bg-white/10 transition-all"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                     )}
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
