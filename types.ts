
export interface NoteReference {
  id: string;
  noteNumber: string;
  title: string;
  description: string;
  definitionPage: number; 
  foundOnPage?: number; 
}

export interface LinkHotspot {
  pageNumber: number;
  noteNumber: string;
  // Normalized coordinates [ymin, xmin, ymax, xmax] (0-1000)
  box: [number, number, number, number]; 
  verificationText?: string; // What the AI thinks is inside the box
  label?: string; // Context/Row text (e.g. "Cash and Cash Equivalents")
  targetPage?: number; // Specific destination page (for TOC or direct links)
}

export interface SectionLink {
  title: string;
  page: number;
  type: 'TOC' | 'STATEMENT' | 'SECTION';
}

export interface AgentLogEntry {
  id: string;
  timestamp: number;
  type: 'THOUGHT' | 'ACTION' | 'TOOL' | 'SYSTEM' | 'SUCCESS' | 'ERROR' | 'WARNING';
  message: string;
  details?: string;
  codeBlock?: string; 
  output?: string; 
  visualEvidence?: string; // Base64 image showing the bounding boxes found
  isThinking?: boolean; // Used to collapse internal monologue in UI
}

export interface AgentTask {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'verified';
}

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  totalCalls: number;
}

// Dictionary mapping Model ID to TokenUsage
export type GlobalUsage = Record<string, TokenUsage>;

export interface ProcessedDocument {
  fileName: string;
  fileUrl: string;
  notes: NoteReference[];
  hotspots: LinkHotspot[];
  sectionLinks: SectionLink[]; 
  analysisSummary: string;
  tocPages: number[]; 
  aiModel: string;
  extractionStrategy: string;
  pageOffset?: number; // Offset between printed page numbers and physical PDF pages
  tokenUsage?: TokenUsage; // New field
}

export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING', 
  PAUSED = 'PAUSED',
  VIEWING = 'VIEWING',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  thoughts?: string; // Internal reasoning from Thinking models
  timestamp: number;
  isThinking?: boolean; // UI state for processing
  attachment?: {
    type: 'image';
    url: string;
    file?: File;
  };
  // Agentic Data
  logs?: AgentLogEntry[];
  tasks?: AgentTask[];
}

export interface Tab {
  id: string;
  type: 'home' | 'document';
  title: string;
  active: boolean;
  // We keep minimal data here, strictly for UI. Detailed state is in DocumentSession.
}

// --- SESSION STATE MANAGEMENT ---
export interface DocumentSession {
  id: string; // Corresponds to Tab ID
  file: File | null;
  fileUrl: string | null;
  fileName: string;
  
  state: AppState;
  data: ProcessedDocument | null;
  
  // Agent State
  logs: AgentLogEntry[];
  tasks: AgentTask[];
  messages: ChatMessage[]; // Chat history
  
  // Model & Usage
  selectedModel: string; // The model selected for this specific tab
  activeAnalysisModel: string | null; // Currently running model (if analyzing)
  tokenUsage: TokenUsage; // Session-specific usage
  
  // UI State persistence
  currentPage: number;
}

// --- MODEL DEFINITIONS & PRICING ---

export interface ModelInfo {
  id: string;
  label: string;
  description: string;
  category: 'Reasoning' | 'Balanced' | 'Fast' | 'Experimental' | 'Live API' | 'Other';
  pricing: {
    input: number; // Per 1M tokens (<= 200k)
    inputHigh?: number; // Per 1M tokens (> 200k)
    output: number; // Per 1M tokens (<= 200k)
    outputHigh?: number; // Per 1M tokens (> 200k)
  };
  contextWindow: number;
  vision: boolean;
  rateLimits?: string; // RPM / TPM
}

export const GEMINI_MODELS: ModelInfo[] = [
  // GEMINI 3 SERIES
  {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    description: 'Most powerful agentic & reasoning model.',
    category: 'Reasoning',
    pricing: { input: 2.00, inputHigh: 4.00, output: 12.00, outputHigh: 18.00 },
    contextWindow: 2000000,
    vision: true,
    rateLimits: 'N/A / 125K TPM'
  },
  {
    id: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image',
    description: 'Native image generation & understanding.',
    category: 'Reasoning',
    pricing: { input: 2.00, output: 12.00 },
    contextWindow: 2000000,
    vision: true
  },
  // GEMINI 2.5 SERIES
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'State-of-the-art multipurpose, coding & reasoning.',
    category: 'Balanced',
    pricing: { input: 1.25, inputHigh: 2.50, output: 10.00, outputHigh: 15.00 },
    contextWindow: 2000000,
    vision: true,
    rateLimits: '2 RPM / 125K TPM'
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Hybrid reasoning, low latency, high volume.',
    category: 'Fast',
    pricing: { input: 0.30, output: 2.50 },
    contextWindow: 1000000,
    vision: true,
    rateLimits: '10 RPM / 250K TPM'
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Most cost effective, built for scale.',
    category: 'Fast',
    pricing: { input: 0.10, output: 0.40 },
    contextWindow: 1000000,
    vision: true,
    rateLimits: '15 RPM / 250K TPM'
  },
  // GEMINI 2.0 SERIES
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    description: 'Balanced multimodal model for agents.',
    category: 'Balanced',
    pricing: { input: 0.10, output: 0.40 },
    contextWindow: 1000000,
    vision: true,
    rateLimits: '15 RPM / 1M TPM'
  },
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash-Lite',
    description: 'Efficient scale usage.',
    category: 'Fast',
    pricing: { input: 0.075, output: 0.30 },
    contextWindow: 1000000,
    vision: true,
    rateLimits: '30 RPM / 1M TPM'
  },
  // EXPERIMENTAL / OTHER
  {
    id: 'gemini-robotics-er-1.5-preview',
    label: 'Gemini Robotics ER',
    description: 'Embodied reasoning & spatial understanding.',
    category: 'Experimental',
    pricing: { input: 0.30, output: 2.50 },
    contextWindow: 1000000,
    vision: true,
    rateLimits: '10 RPM / 250K TPM'
  },
  {
    id: 'learnlm-2.0-flash-experimental',
    label: 'LearnLM 2.0 Flash',
    description: 'Optimized for learning and tutoring tasks.',
    category: 'Experimental',
    pricing: { input: 0.10, output: 0.40 },
    contextWindow: 1000000,
    vision: true,
    rateLimits: '15 RPM'
  },
  // LIVE API (Vision Capable)
  {
    id: 'gemini-2.5-flash-live',
    label: 'Gemini 2.5 Flash Live',
    description: 'Real-time low latency.',
    category: 'Live API',
    pricing: { input: 0.50, output: 2.00 }, // Text pricing approximation
    contextWindow: 1000000,
    vision: true,
    rateLimits: 'Unlimited'
  }
];
