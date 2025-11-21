
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, DocumentSession, TokenUsage, Tab, GEMINI_MODELS, GlobalUsage, ChatMessage } from './types';
import { createDocumentChatSession, driveAgentAnalysis } from './services/gemini';
import { generateInteractivePDF } from './services/pdfModifier';
import { getPdfPageCount } from './services/pdfUtils';
import { UploadZone } from './components/UploadZone';
import { Sidebar } from './components/Sidebar';
import { PDFViewer } from './components/PDFViewer';
import { MenuBar } from './components/MenuBar';
import { UsageModal } from './components/UsageModal';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { BatchDashboard } from './components/BatchDashboard';
import { Plus, X, FileCheck, Layers } from 'lucide-react';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  // --- GLOBAL STATE ---
  const [lifetimeUsage, setLifetimeUsage] = useState<GlobalUsage>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [hiddenModelIds, setHiddenModelIds] = useState<string[]>([]);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);

  // --- TAB & SESSION MANAGEMENT ---
  const [tabs, setTabs] = useState<Tab[]>([
      { id: 'home', type: 'home', title: 'Dashboard', active: true }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('home');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabValue, setEditingTabValue] = useState("");
  
  // The "Brain" of the app: Stores full state for each document tab
  const [sessions, setSessions] = useState<Record<string, DocumentSession>>({});

  // Refs for non-serializable objects (Chat Instances & Abort Controllers)
  const chatInstancesRef = useRef<Map<string, Chat>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // --- UI STATE ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Temporary state for the "Home" tab's model selection before a file is picked
  const [homeTabModel, setHomeTabModel] = useState<string>('gemini-2.5-flash');

  // --- EFFECTS ---
  useEffect(() => {
    const savedModel = localStorage.getItem('docnav_model');
    if (savedModel) setHomeTabModel(savedModel);

    const savedUsage = localStorage.getItem('docnav_usage');
    if (savedUsage) {
        try { setLifetimeUsage(JSON.parse(savedUsage)); } catch (e) { console.error(e); }
    }

    const savedHiddenModels = localStorage.getItem('docnav_hidden_models');
    if (savedHiddenModels) {
        try { setHiddenModelIds(JSON.parse(savedHiddenModels)); } catch(e) { console.error(e); }
    }

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      localStorage.setItem('docnav_model', homeTabModel);
  }, [homeTabModel]);

  // --- HELPERS ---
  const activeSession = sessions[activeTabId];
  const activeTab = tabs.find(t => t.id === activeTabId);

  // --- SETTINGS HANDLERS ---
  const toggleModelVisibility = (modelId: string) => {
      setHiddenModelIds(prev => {
          const newHidden = prev.includes(modelId) 
              ? prev.filter(id => id !== modelId)
              : [...prev, modelId];
          localStorage.setItem('docnav_hidden_models', JSON.stringify(newHidden));
          return newHidden;
      });
  };

  // --- RESIZE HANDLERS ---
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  
  const resize = useCallback((e: MouseEvent) => {
      if (isResizing) {
          const newWidth = window.innerWidth - e.clientX;
          if (newWidth > 280 && newWidth < 800) {
              setSidebarWidth(newWidth);
          }
      }
  }, [isResizing]);

  useEffect(() => {
      if (isResizing) {
          window.addEventListener("mousemove", resize);
          window.addEventListener("mouseup", stopResizing);
      } else {
          window.removeEventListener("mousemove", resize);
          window.removeEventListener("mouseup", stopResizing);
      }
      return () => {
          window.removeEventListener("mousemove", resize);
          window.removeEventListener("mouseup", stopResizing);
      };
  }, [isResizing, resize, stopResizing]);

  const commitSessionUsageToLifetime = (finalSessionUsage: TokenUsage, modelId: string) => {
      setLifetimeUsage(prev => {
          const currentModelUsage = prev[modelId] || { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, totalCalls: 0 };
          const newModelUsage = {
              promptTokens: currentModelUsage.promptTokens + finalSessionUsage.promptTokens,
              candidatesTokens: currentModelUsage.candidatesTokens + finalSessionUsage.candidatesTokens,
              totalTokens: currentModelUsage.totalTokens + finalSessionUsage.totalTokens,
              totalCalls: currentModelUsage.totalCalls + finalSessionUsage.totalCalls
          };
          const newLifetime = { ...prev, [modelId]: newModelUsage };
          localStorage.setItem('docnav_usage', JSON.stringify(newLifetime));
          return newLifetime;
      });
  };

  // --- CORE: HANDLE FILE UPLOAD (STAGING) ---
  const handleFileSelect = async (files: File[], overrideModelId?: string) => {
    const modelToUse = overrideModelId || homeTabModel;
    
    const newSessionsMap: Record<string, DocumentSession> = {};
    const newTabIds: string[] = [];

    files.forEach(file => {
        const newTabId = Math.random().toString(36).substr(2, 9);
        newTabIds.push(newTabId);
        const url = URL.createObjectURL(file);
        
        newSessionsMap[newTabId] = {
            id: newTabId,
            file: file,
            fileUrl: url,
            fileName: file.name,
            state: AppState.IDLE, // Waiting for user to click Start
            data: {
                fileName: file.name,
                fileUrl: url,
                notes: [],
                hotspots: [],
                sectionLinks: [],
                analysisSummary: "Ready to initialize...",
                tocPages: [],
                aiModel: modelToUse,
                extractionStrategy: "Pending",
                tokenUsage: undefined
            },
            logs: [],
            tasks: [],
            messages: [],
            selectedModel: modelToUse,
            activeAnalysisModel: null,
            tokenUsage: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, totalCalls: 0 },
            currentPage: 1
        };
    });

    setSessions(prev => ({ ...prev, ...newSessionsMap }));

    // If SINGLE MODE, open the first file immediately
    if (!isBatchMode && newTabIds.length > 0) {
        const firstId = newTabIds[0];
        const fileName = newSessionsMap[firstId].fileName;
        
        if (tabs.length === 1 && tabs[0].type === 'home') {
            setTabs([{ id: firstId, type: 'document', title: fileName, active: true }]);
        } else {
            setTabs(prev => [...prev.map(t => ({...t, active: false})), { id: firstId, type: 'document', title: fileName, active: true }]);
        }
        setActiveTabId(firstId);
        setIsSidebarOpen(true);
    } 
  };

  // --- CORE: START ANALYSIS ---
  const handleStartAnalysis = async (tabId: string) => {
      const session = sessions[tabId];
      if (!session || !session.file) return;

      const modelId = session.selectedModel;
      const file = session.file;
      
      setSessions(prev => ({
          ...prev,
          [tabId]: {
              ...prev[tabId],
              state: AppState.ANALYZING,
              activeAnalysisModel: modelId
          }
      }));

      try {
          const customKey = localStorage.getItem('docnav_google_key');
          const apiKey = customKey || process.env.API_KEY;

          if (!apiKey) {
              throw new Error("API Key missing. Please configure it in Settings.");
          }

          const totalPages = await getPdfPageCount(file);
          const chat = await createDocumentChatSession(apiKey, file, totalPages, modelId);
          
          chatInstancesRef.current.set(tabId, chat);
          const abortController = new AbortController();
          abortControllersRef.current.set(tabId, abortController);

          await driveAgentAnalysis(
              chat, file, totalPages, modelId,
              (logs, tasks, partialHotspots, partialNotes, partialSections, usage) => {
                  setSessions(currentSessions => {
                      const currentSession = currentSessions[tabId];
                      if (!currentSession) return currentSessions;

                      return {
                          ...currentSessions,
                          [tabId]: {
                              ...currentSession,
                              logs,
                              tasks,
                              tokenUsage: usage || currentSession.tokenUsage,
                              data: currentSession.data ? {
                                  ...currentSession.data,
                                  hotspots: partialHotspots || currentSession.data.hotspots,
                                  notes: partialNotes || currentSession.data.notes,
                                  sectionLinks: partialSections || currentSession.data.sectionLinks,
                                  tokenUsage: usage
                              } : null
                          }
                      };
                  });
              },
              abortController.signal
          );

          // Completion
          setSessions(currentSessions => {
              const currentSession = currentSessions[tabId];
              if (!currentSession) return currentSessions;
              
              if (currentSession.tokenUsage) commitSessionUsageToLifetime(currentSession.tokenUsage, modelId);

              return {
                  ...currentSessions,
                  [tabId]: {
                      ...currentSession,
                      state: AppState.VIEWING,
                      activeAnalysisModel: null,
                  }
              };
          });

      } catch (err: any) {
          setSessions(currentSessions => {
              const currentSession = currentSessions[tabId];
              if (!currentSession) return currentSessions;

              if (err.message !== 'Analysis aborted by user.') {
                  if (currentSession.tokenUsage && currentSession.activeAnalysisModel) {
                      commitSessionUsageToLifetime(currentSession.tokenUsage, currentSession.activeAnalysisModel);
                  }
                  return {
                      ...currentSessions,
                      [tabId]: {
                          ...currentSession,
                          state: err.message === 'RATE_LIMIT_EXCEEDED' ? AppState.PAUSED : AppState.ERROR, 
                          tasks: currentSession.tasks.map(t => t.status === 'running' ? { ...t, status: 'failed' } : t),
                          activeAnalysisModel: null
                      }
                  };
              }
              return currentSessions;
          });
      }
  };

  const handleStartBatch = async () => {
      Object.values(sessions).forEach(session => {
          if (session.state === AppState.IDLE) {
              handleStartAnalysis(session.id);
          }
      });
  };

  const handleStopAnalysis = () => {
      const controller = abortControllersRef.current.get(activeTabId);
      if (controller) {
          controller.abort();
          abortControllersRef.current.delete(activeTabId);
          
          setSessions(prev => {
              const session = prev[activeTabId];
              if (!session) return prev;
              
              if (session.activeAnalysisModel) {
                  commitSessionUsageToLifetime(session.tokenUsage, session.activeAnalysisModel);
              }

              return {
                  ...prev,
                  [activeTabId]: {
                      ...session,
                      state: AppState.PAUSED,
                      activeAnalysisModel: null
                  }
              };
          });
      }
  };

  const handleDownload = async () => {
    if (!activeSession || !activeSession.data || !activeSession.file) return;
    try {
      setIsDownloading(true);
      const fileBuffer = await activeSession.file.arrayBuffer();
      const modifiedPdfBytes = await generateInteractivePDF(
        fileBuffer,
        activeSession.data.hotspots,
        activeSession.data.notes
      );
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      let downloadName = activeSession.fileName;
      if (!downloadName.toLowerCase().endsWith('.pdf')) {
          downloadName += '.pdf';
      }
      link.download = downloadName;

      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      alert("Export failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNewTab = () => {
      const tabId = Math.random().toString(36).substr(2, 9);
      setTabs(prev => [...prev.map(t => ({...t, active: false})), { id: tabId, type: 'home', title: 'Dashboard', active: true }]);
      setActiveTabId(tabId);
  };

  const handleTabClick = (tabId: string) => {
      setTabs(prev => prev.map(t => ({...t, active: t.id === tabId})));
      setActiveTabId(tabId);
  };

  const handleOpenSessionFromBatch = (sessionId: string) => {
      const session = sessions[sessionId];
      if (!session) return;
      
      const existingTab = tabs.find(t => t.id === sessionId);
      if (existingTab) {
          handleTabClick(sessionId);
      } else {
          setTabs(prev => [...prev.map(t => ({...t, active: false})), { id: sessionId, type: 'document', title: session.fileName, active: true }]);
          setActiveTabId(sessionId);
          setIsSidebarOpen(true);
      }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      handleRemoveSession(tabId);
  };

  const handleRemoveSession = (sessionId: string) => {
      const session = sessions[sessionId];
      if (session?.fileUrl) URL.revokeObjectURL(session.fileUrl);
      chatInstancesRef.current.delete(sessionId);
      const controller = abortControllersRef.current.get(sessionId);
      if (controller) controller.abort();
      abortControllersRef.current.delete(sessionId);
      
      setSessions(prev => {
          const { [sessionId]: deleted, ...rest } = prev;
          return rest;
      });

      const newTabs = tabs.filter(t => t.id !== sessionId);
      if (newTabs.length === 0) {
          setTabs([{ id: 'home', type: 'home', title: 'Dashboard', active: true }]);
          setActiveTabId('home');
      } else {
          setTabs(newTabs);
          if (activeTabId === sessionId) {
              const last = newTabs[newTabs.length - 1];
              last.active = true;
              setActiveTabId(last.id);
          }
      }
  };

  const handleRenameSession = (sessionId: string, newName: string) => {
      setSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          return {
              ...prev,
              [sessionId]: {
                  ...session,
                  fileName: newName,
                  data: session.data ? { ...session.data, fileName: newName } : session.data
              }
          };
      });
      
      setTabs(prev => prev.map(t => t.id === sessionId ? { ...t, title: newName } : t));
  };

  const handleStartTabRename = (tab: Tab) => {
      setEditingTabId(tab.id);
      setEditingTabValue(tab.title);
  };

  const handleSubmitTabRename = () => {
      if (editingTabId && editingTabValue.trim()) {
          const tab = tabs.find(t => t.id === editingTabId);
          if (tab) {
              if (tab.type === 'document') {
                  handleRenameSession(tab.id, editingTabValue.trim());
              } else {
                  setTabs(prev => prev.map(t => t.id === editingTabId ? { ...t, title: editingTabValue.trim() } : t));
              }
          }
      }
      setEditingTabId(null);
  };

  const updateSessionModel = (modelId: string, sessionId?: string) => {
      if (sessionId) {
          setSessions(prev => ({
              ...prev,
              [sessionId]: {
                  ...prev[sessionId],
                  selectedModel: modelId
              }
          }));
          return;
      }

      if (activeTab?.type === 'home') {
          setHomeTabModel(modelId);
      } else if (activeSession) {
          setSessions(prev => ({
              ...prev,
              [activeTabId]: {
                  ...prev[activeTabId],
                  selectedModel: modelId
              }
          }));
      }
  };

  const handleUpdateGlobalModel = (modelId: string) => {
      setHomeTabModel(modelId);
      setSessions(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
              if (updated[key].state === AppState.IDLE) {
                  updated[key] = { ...updated[key], selectedModel: modelId };
              }
          });
          return updated;
      });
  };

  const currentSessionUsage = activeSession?.tokenUsage || { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, totalCalls: 0 };
  const currentModelId = activeSession?.activeAnalysisModel || activeSession?.selectedModel || homeTabModel;
  const activeModelInfo = GEMINI_MODELS.find(m => m.id === currentModelId) || GEMINI_MODELS[3];
  const inputCost = (currentSessionUsage.promptTokens / 1000000) * activeModelInfo.pricing.input;
  const outputCost = (currentSessionUsage.candidatesTokens / 1000000) * activeModelInfo.pricing.output;
  const currentSessionCost = (inputCost + outputCost).toFixed(4);

  return (
    <div className="h-[100dvh] w-screen bg-[#09090b] text-white overflow-hidden font-sans flex flex-col">
      
      <UsageModal 
        isOpen={isUsageModalOpen} 
        onClose={() => setIsUsageModalOpen(false)}
        sessionUsage={currentSessionUsage}
        lifetimeUsage={lifetimeUsage}
        activeModelId={currentModelId} 
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hiddenModelIds={hiddenModelIds}
        onToggleModel={toggleModelVisibility}
        systemApiKey={process.env.API_KEY || ""}
      />
      
      <AboutModal 
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <MenuBar 
        onOpenClick={() => document.getElementById('file-upload-hidden')?.click()}
        onNewClick={handleNewTab}
        onExportClick={handleDownload}
        onUsageClick={() => setIsUsageModalOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onAboutClick={() => setIsAboutOpen(true)}
        selectedModel={currentModelId}
        estimatedCost={currentSessionCost}
        activeFileName={activeSession?.fileName || (isBatchMode ? "Batch Mode" : "")}
      />
      <input 
        type="file" 
        id="file-upload-hidden" 
        className="hidden" 
        accept="application/pdf" 
        multiple={isBatchMode}
        onChange={(e) => {
             if(e.target.files && e.target.files.length > 0) {
                 const files = Array.from(e.target.files);
                 handleFileSelect(files, currentModelId);
             }
        }} 
      />

      <div className="h-9 bg-[#0c0c0e] flex items-end px-2 gap-1 border-b border-white/5 select-none">
          {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onDoubleClick={() => handleStartTabRename(tab)}
                className={`
                    group relative flex items-center gap-2 px-3 py-2 text-[11px] font-medium rounded-t-md min-w-[120px] max-w-[200px] cursor-pointer transition-colors border-t border-x
                    ${tab.active 
                        ? 'bg-[#18181b] text-white border-white/10 border-b-[#18181b] z-10' 
                        : 'bg-transparent text-slate-500 border-transparent hover:bg-[#18181b]/50 hover:text-slate-300'
                    }
                `}
                style={{ marginBottom: '-1px' }}
              >
                  {tab.type === 'home' ? <Layers className={`w-3 h-3 ${tab.active ? 'text-indigo-400' : 'opacity-50'}`} /> : <FileCheck className={`w-3 h-3 ${tab.active ? 'text-indigo-400' : 'opacity-50'}`} />}
                  
                  {editingTabId === tab.id ? (
                      <input 
                          autoFocus
                          type="text"
                          value={editingTabValue}
                          onChange={(e) => setEditingTabValue(e.target.value)}
                          onBlur={handleSubmitTabRename}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSubmitTabRename();
                              if (e.key === 'Escape') setEditingTabId(null);
                          }}
                          className="bg-transparent border-none outline-none text-[11px] font-medium text-white w-full min-w-[60px] p-0 m-0 flex-1"
                          onClick={(e) => e.stopPropagation()}
                          autoComplete="off"
                          spellCheck={false}
                      />
                  ) : (
                      <span className="truncate flex-1">{tab.title}</span>
                  )}

                  <button 
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className={`p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-red-400 transition-all`}
                  >
                      <X className="w-3 h-3" />
                  </button>
              </div>
          ))}
          <button onClick={handleNewTab} className="p-1.5 mb-1 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-colors">
              <Plus className="w-4 h-4" />
          </button>
      </div>

      <main className="flex-1 relative z-0 flex overflow-hidden bg-[#18181b]">
        
        {activeTab?.type === 'home' && (
            <div className="w-full h-full overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#09090b] to-[#050505]">
                {Object.keys(sessions).length > 0 ? (
                    <BatchDashboard 
                        sessions={Object.values(sessions)}
                        onOpenSession={handleOpenSessionFromBatch}
                        onRemoveSession={handleRemoveSession}
                        onRenameSession={handleRenameSession}
                        onUpdateModel={(sid, mid) => updateSessionModel(mid, sid)}
                        onStartAnalysis={handleStartAnalysis}
                        onStartAll={handleStartBatch}
                        globalModelId={homeTabModel}
                        onUpdateGlobalModel={handleUpdateGlobalModel}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-10">
                        <UploadZone 
                            onFileSelect={(files) => handleFileSelect(files, homeTabModel)} 
                            selectedModel={homeTabModel}
                            onModelSelect={setHomeTabModel}
                            hiddenModelIds={hiddenModelIds}
                            isBatchMode={isBatchMode}
                            onToggleMode={setIsBatchMode}
                        />
                    </div>
                )}
            </div>
        )}

        {activeTab?.type === 'document' && activeSession && (
            <div className="w-full h-full flex">
                <div className="flex-1 bg-[#0c0c0e] relative overflow-hidden flex flex-col w-full">
                    <PDFViewer 
                        fileUrl={activeSession.fileUrl!} 
                        pageNumber={activeSession.currentPage} 
                        hotspots={activeSession.data?.hotspots}
                        onPageChange={(pg) => setSessions(prev => ({ ...prev, [activeTabId]: { ...prev[activeTabId], currentPage: pg } }))}
                        onLinkClick={(ref) => {
                            const hotspot = activeSession.data?.hotspots.find(h => h.noteNumber === ref && h.pageNumber === activeSession.currentPage);
                            if (hotspot?.targetPage) {
                                setSessions(prev => ({ ...prev, [activeTabId]: { ...prev[activeTabId], currentPage: hotspot.targetPage! } }));
                            } else {
                                const note = activeSession.data?.notes.find(n => n.noteNumber === ref);
                                if (note) {
                                    setSessions(prev => ({ ...prev, [activeTabId]: { ...prev[activeTabId], currentPage: note.definitionPage } }));
                                }
                            }
                        }}
                        isSidebarOpen={isSidebarOpen}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                </div>

                <div 
                    className={`
                        ${isMobile ? 'absolute top-0 bottom-0 right-0 z-40' : 'relative'}
                        transition-opacity duration-300 ease-in-out flex-shrink-0 border-l border-white/5 bg-[#09090b]
                    `}
                    style={{ 
                        width: isSidebarOpen ? (isMobile ? '100%' : `${sidebarWidth}px`) : 0,
                        opacity: isSidebarOpen ? 1 : 0,
                        overflow: 'visible'
                    }}
                >
                    {isSidebarOpen && !isMobile && (
                        <div
                            onMouseDown={startResizing}
                            className={`
                                absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500/50 transition-colors
                                ${isResizing ? 'bg-indigo-500' : 'bg-transparent'}
                            `}
                            style={{ transform: 'translateX(-50%)' }}
                        />
                    )}

                    <div className="w-full h-full overflow-hidden">
                        <Sidebar 
                            notes={activeSession.data?.notes || []} 
                            sectionLinks={activeSession.data?.sectionLinks}
                            onNavigate={(pg) => setSessions(prev => ({ ...prev, [activeTabId]: { ...prev[activeTabId], currentPage: pg } }))}
                            chatSession={chatInstancesRef.current.get(activeTabId) || null}
                            activeFile={activeSession.file}
                            isAnalyzing={activeSession.state === AppState.ANALYZING}
                            onStopAnalysis={handleStopAnalysis}
                            agentLogs={activeSession.logs}
                            agentTasks={activeSession.tasks}
                            onClose={() => setIsSidebarOpen(false)}
                            onStartAnalysis={() => handleStartAnalysis(activeTabId)}
                            selectedModel={activeSession.selectedModel}
                            onModelSelect={(mid) => updateSessionModel(mid, activeTabId)}
                            globalUsage={lifetimeUsage}
                            hiddenModelIds={hiddenModelIds}
                            initialMessages={activeSession.messages} 
                            onMessagesUpdate={(msgs) => setSessions(prev => ({ ...prev, [activeTabId]: { ...prev[activeTabId], messages: msgs } }))}
                        />
                    </div>
                </div>
            </div>
        )}
      </main>
      
      {isResizing && (
          <div className="fixed inset-0 cursor-col-resize z-[9999]" />
      )}
    </div>
  );
};

export default App;
