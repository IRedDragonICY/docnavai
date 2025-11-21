
import React, { useState, useEffect } from 'react';
import { X, Search, Cpu, Key, Monitor, Shield, Check, Eye, EyeOff, Save, RotateCcw } from 'lucide-react';
import { GEMINI_MODELS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hiddenModelIds: string[];
  onToggleModel: (modelId: string) => void;
  systemApiKey?: string; // NEW PROP
}

type SettingsTab = 'general' | 'models' | 'api_keys';

// Helper component for API Inputs
const ApiKeyInput = ({ 
  label, 
  storageKey, 
  systemValue 
}: { 
  label: string; 
  storageKey: string; 
  systemValue?: string; 
}) => {
  const [storedKey, setStoredKey] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial state
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setStoredKey(stored);
      setInputValue(stored);
    } else if (systemValue) {
        setInputValue(systemValue);
    }
    setIsLoaded(true);
  }, [storageKey, systemValue]);

  const handleSave = () => {
    if (inputValue.trim()) {
      localStorage.setItem(storageKey, inputValue.trim());
      setStoredKey(inputValue.trim());
    }
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setStoredKey('');
    // Revert to system value if available, else empty
    setInputValue(systemValue || '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  if (!isLoaded) return null;

  // "Dirty" means the input box differs from what is saved (storedKey)
  // OR if no stored key, it differs from the system default
  const isCustom = !!storedKey;
  const isDirty = isCustom ? inputValue !== storedKey : inputValue !== (systemValue || '');
  const isSystemActive = !isCustom && !!systemValue && inputValue === systemValue;

  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-300">{label}</label>
          
          {isSystemActive && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Check className="w-3 h-3" /> System Key Active
            </span>
          )}
          
          {isCustom && !isDirty && (
             <span className="text-[10px] text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
               <Check className="w-3 h-3" /> Custom Key Saved
             </span>
          )}
          
          {isDirty && (
             <span className="text-[10px] text-yellow-400 flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
               Unsaved Changes
             </span>
          )}
       </div>
       
       <div className="relative group">
          <input 
             type={isVisible ? "text" : "password"}
             value={inputValue}
             onChange={handleChange}
             placeholder={systemValue ? "Using System Key" : "Enter your API Key starting with sk-..."}
             className={`
                w-full bg-[#121214] border rounded-lg pl-4 pr-20 py-2.5 text-xs text-white placeholder-slate-600 
                focus:outline-none focus:ring-1 transition-all font-mono
                ${isDirty 
                    ? 'border-yellow-500/50 focus:border-yellow-500 focus:ring-yellow-500/20' 
                    : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20'
                }
                ${isSystemActive ? 'text-emerald-400/80' : ''}
             `}
             autoComplete="off"
             spellCheck="false"
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             {isDirty ? (
                <button 
                   onClick={handleSave}
                   className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors shadow-lg shadow-indigo-500/20"
                   title="Save Key"
                >
                   <Save className="w-3 h-3" />
                </button>
             ) : isCustom ? (
                <button 
                   onClick={handleReset}
                   className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                   title="Reset to System Default"
                >
                   <RotateCcw className="w-3.5 h-3.5" />
                </button>
             ) : null}
             
             <button 
                onClick={() => setIsVisible(!isVisible)}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                title={isVisible ? "Hide Key" : "Show Key"}
             >
                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
             </button>
          </div>
       </div>
       
       {isSystemActive && (
           <p className="text-[10px] text-slate-500 pl-1">
               Using key defined in deployment environment. Type to override.
           </p>
       )}
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  hiddenModelIds, 
  onToggleModel,
  systemApiKey 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('models');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredModels = GEMINI_MODELS.filter(m => 
    m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
        checked ? 'bg-indigo-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-1'
        }`}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[800px] h-[600px] bg-[#0c0c0e] border border-white/10 rounded-xl shadow-2xl flex overflow-hidden ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-[#09090b] border-r border-white/5 flex flex-col p-3 space-y-1">
          <div className="px-3 py-4 mb-2">
             <h2 className="text-sm font-bold text-slate-200 tracking-wide">Settings</h2>
          </div>
          
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'general' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
          >
            <Monitor className="w-4 h-4" /> General
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'models' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
          >
            <Cpu className="w-4 h-4" /> Models
          </button>
          <button 
            onClick={() => setActiveTab('api_keys')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'api_keys' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
          >
            <Key className="w-4 h-4" /> API Keys
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-[#0c0c0e]">
          
          {/* Header */}
          <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
             <h3 className="text-sm font-semibold text-white capitalize">{activeTab.replace('_', ' ')}</h3>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-white/5">
                 <X className="w-4 h-4" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            
            {/* --- MODELS TAB --- */}
            {activeTab === 'models' && (
              <div className="space-y-4">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                   <input 
                      type="text" 
                      placeholder="Search models..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#121214] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                   />
                </div>

                <div className="space-y-1">
                   <div className="flex items-center justify-between px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Model Name</span>
                      <span>Enabled</span>
                   </div>
                   {filteredModels.map(model => {
                      const isHidden = hiddenModelIds.includes(model.id);
                      return (
                        <div key={model.id} className="flex items-center justify-between px-4 py-3 bg-[#121214] border border-white/5 rounded-lg group hover:border-white/10 transition-colors">
                           <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{model.label}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{model.id}</span>
                           </div>
                           <Toggle checked={!isHidden} onChange={() => onToggleModel(model.id)} />
                        </div>
                      );
                   })}
                </div>
                <div className="text-[10px] text-slate-500 pt-2 text-center">
                   Disabling a model hides it from the selection menus across the application.
                </div>
              </div>
            )}

            {/* --- API KEYS TAB --- */}
            {activeTab === 'api_keys' && (
              <div className="space-y-6">
                 <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                       <h4 className="text-xs font-bold text-indigo-300 mb-1">Secure Storage</h4>
                       <p className="text-[11px] text-indigo-200/70 leading-relaxed">
                          API keys are stored locally in your browser's encrypted storage (LocalStorage). They are injected directly into the AI Client client-side and are never sent to our own servers.
                       </p>
                    </div>
                 </div>

                 {/* Google AI Studio */}
                 <ApiKeyInput 
                    label="Google AI Studio Key"
                    storageKey="docnav_google_key"
                    systemValue={systemApiKey} // PASSING SYSTEM VALUE
                 />

                 <div className="h-px bg-white/5 w-full" />

                 {/* OpenAI */}
                 <ApiKeyInput 
                    label="OpenAI API Key"
                    storageKey="docnav_openai_key"
                 />

                 {/* Anthropic */}
                 <ApiKeyInput 
                    label="Anthropic API Key"
                    storageKey="docnav_anthropic_key"
                 />

                 {/* Azure - Disabled UI for now */}
                 <div className="space-y-2 opacity-50 pointer-events-none filter blur-[1px]">
                    <div className="flex justify-between items-center">
                       <label className="text-xs font-medium text-slate-300">Azure OpenAI (Coming Soon)</label>
                       <Toggle checked={false} onChange={() => {}} />
                    </div>
                 </div>

              </div>
            )}

             {/* --- GENERAL TAB --- */}
             {activeTab === 'general' && (
                 <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                     <Monitor className="w-8 h-8 opacity-20" />
                     <p className="text-xs">General application settings coming soon.</p>
                 </div>
             )}

          </div>
        </div>
      </div>
    </div>
  );
};
