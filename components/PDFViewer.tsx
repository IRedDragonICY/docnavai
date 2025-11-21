import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle, PanelRight, GripVertical, ArrowUp, ArrowDown, File, Files, MoreHorizontal } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { LinkHotspot } from '../types';

// Initialize PDF.js
const initPDF = () => {
  const lib = (pdfjsLib as any).default || pdfjsLib;
  if (typeof window !== 'undefined' && !lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return lib;
};

const pdfjs = initPDF();

// --- TYPES ---

interface PDFViewerProps {
  fileUrl: string;
  pageNumber: number;
  hotspots?: LinkHotspot[];
  onPageChange?: (page: number) => void;
  onLinkClick?: (noteNumber: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface PDFPageProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  hotspots: LinkHotspot[];
  onLinkClick?: (noteNumber: string) => void;
  isVisible: boolean; // Optimization: only render if near viewport
  registerPageRef: (pageNum: number, el: HTMLDivElement | null) => void;
}

// --- SUB-COMPONENT: PDF PAGE ---
// Handles rendering a single page canvas and its hotspots
const PDFPage: React.FC<PDFPageProps> = React.memo(({ 
  pdfDoc, 
  pageNum, 
  scale, 
  hotspots, 
  onLinkClick, 
  isVisible,
  registerPageRef 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [isRendered, setIsRendered] = useState(false);

  // 1. Setup Dimensions immediately to reserve space (prevent layout shift)
  useEffect(() => {
    if (!pdfDoc) return;
    pdfDoc.getPage(pageNum).then((page: any) => {
      const viewport = page.getViewport({ scale });
      setDims({ width: viewport.width, height: viewport.height });
    });
  }, [pdfDoc, pageNum, scale]);

  // 2. Render Canvas when visible
  useEffect(() => {
    if (!isVisible || !dims.width || !canvasRef.current || isRendered) return;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        const context = canvasRef.current?.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        
        // High DPI rendering
        const outputScale = window.devicePixelRatio || 1;
        canvasRef.current!.width = Math.floor(viewport.width * outputScale);
        canvasRef.current!.height = Math.floor(viewport.height * outputScale);
        
        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        setIsRendered(true);
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    };

    render();
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        setIsRendered(false);
      }
    };
  }, [pdfDoc, pageNum, scale, isVisible, dims.width]);

  // Reset render status if scale changes
  useEffect(() => {
    setIsRendered(false);
  }, [scale]);

  const getBoxStyle = (box: [number, number, number, number]) => {
      let [ymin, xmin, ymax, xmax] = box;
      // Clamp & Normalize
      ymin = Math.max(0, Math.min(1000, ymin));
      xmin = Math.max(0, Math.min(1000, xmin));
      ymax = Math.max(0, Math.min(1000, ymax));
      xmax = Math.max(0, Math.min(1000, xmax));

      return {
          top: `${ymin / 10}%`,
          left: `${xmin / 10}%`,
          width: `${(xmax - xmin) / 10}%`,
          height: `${(ymax - ymin) / 10}%`
      };
  };

  return (
    <div 
      ref={(el) => registerPageRef(pageNum, el)}
      className="relative bg-white shadow-2xl mb-8 transition-all duration-200 ease-out mx-auto ring-1 ring-black/5"
      style={{ 
        width: dims.width || 'auto', 
        height: dims.height || 'auto',
        minHeight: '800px' // Placeholder height
      }}
      data-page-number={pageNum}
    >
      <canvas 
        ref={canvasRef} 
        className="block"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Hotspots Layer */}
      {dims.width > 0 && hotspots.map((hotspot, idx) => (
        <button
            key={idx}
            onClick={() => onLinkClick?.(hotspot.noteNumber)}
            className="absolute bg-indigo-500/10 border border-indigo-500/60 hover:bg-indigo-500/30 z-10 group cursor-pointer transition-colors duration-150"
            style={{ ...getBoxStyle(hotspot.box), mixBlendMode: 'multiply' }}
        >
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#18181b] text-white text-[10px] px-2.5 py-1.5 rounded-md shadow-xl border border-white/10 whitespace-nowrap pointer-events-none z-20 font-medium tracking-wide animate-in fade-in zoom-in-95 duration-150">
                Link to Note <span className="text-indigo-400 font-mono ml-1">{hotspot.noteNumber}</span>
            </div>
        </button>
      ))}
    </div>
  );
});


// --- MAIN COMPONENT ---

export const PDFViewer: React.FC<PDFViewerProps> = ({ 
  fileUrl, 
  pageNumber, 
  hotspots = [], 
  onPageChange,
  onLinkClick,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single');
  const [pageInput, setPageInput] = useState(pageNumber.toString());

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isInternalScroll = useRef(false); // Block sync when scrolling programmatically

  // 1. Load Document
  useEffect(() => {
    const loadPdf = async () => {
      if (!fileUrl) return;
      try {
        setIsLoading(true);
        setError(null);
        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      } catch (err: any) {
        setError("Failed to load PDF document.");
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [fileUrl]);

  // 2. Sync Prop PageNumber -> Input & Scroll
  useEffect(() => {
    setPageInput(pageNumber.toString());
    
    // Scroll to page if we are in Scroll Mode and it wasn't an internal scroll event
    if (viewMode === 'scroll' && !isInternalScroll.current && pageRefs.current.has(pageNumber)) {
        pageRefs.current.get(pageNumber)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    isInternalScroll.current = false;
  }, [pageNumber, viewMode]);

  // 3. Intersection Observer for Scroll Mode
  useEffect(() => {
    if (viewMode !== 'scroll' || isLoading) return;

    const options = {
      root: containerRef.current,
      rootMargin: '-40% 0px -40% 0px', // Trigger when page center is in view
      threshold: 0.1
    };

    const callback: IntersectionObserverCallback = (entries) => {
      // Find the entry with the largest intersection ratio
      const visibleEntry = entries.reduce((max, entry) => {
        return entry.intersectionRatio > max.intersectionRatio ? entry : max;
      }, entries[0]);

      if (visibleEntry && visibleEntry.isIntersecting) {
        const pageNum = parseInt(visibleEntry.target.getAttribute('data-page-number') || '1');
        if (pageNum !== pageNumber) {
          isInternalScroll.current = true;
          onPageChange?.(pageNum);
        }
      }
    };

    observerRef.current = new IntersectionObserver(callback, options);
    
    // Observe all registered pages
    pageRefs.current.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [viewMode, isLoading, numPages]); // Don't depend on pageNumber to avoid loop

  // Helper to register refs
  const registerPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el);
      // If we just mounted the current page in scroll mode, observe it
      if (viewMode === 'scroll' && observerRef.current) observerRef.current.observe(el);
    } else {
      pageRefs.current.delete(pageNum);
    }
  }, [viewMode]);

  // Navigation Handlers
  const changePage = (delta: number) => {
    const newPage = Math.max(1, Math.min(numPages, pageNumber + delta));
    onPageChange?.(newPage);
  };

  // STRICT NUMERIC VALIDATION HANDLER
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Only allow numeric digits
      if (/^\d*$/.test(val)) {
          setPageInput(val);
      }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pageInput === '') return;
    
    const val = parseInt(pageInput);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      onPageChange?.(val);
      // Explicitly remove focus to hide keyboard on mobile / reset UI state
      (document.activeElement as HTMLElement)?.blur();
    } else {
      setPageInput(pageNumber.toString()); // Reset on invalid
    }
  };

  const handleInputBlur = () => {
      if (pageInput === '' || parseInt(pageInput) < 1 || parseInt(pageInput) > numPages) {
          setPageInput(pageNumber.toString());
      }
  };

  const zoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(3.0, prev + delta)));
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0c0c0e]">
      
      {/* --- AGENCY STYLE TOOLBAR --- */}
      <div className="h-14 bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20 select-none relative">
        
        {/* Left: View Modes */}
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#18181b] rounded-lg p-1 border border-white/5 shadow-inner">
                 <button 
                    onClick={() => setViewMode('single')}
                    className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'single' ? 'bg-[#27272a] text-indigo-400 shadow-sm ring-1 ring-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    title="Single Page View"
                 >
                    <File className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setViewMode('scroll')}
                    className={`p-1.5 rounded-md transition-all duration-200 ${viewMode === 'scroll' ? 'bg-[#27272a] text-indigo-400 shadow-sm ring-1 ring-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    title="Continuous Scroll"
                 >
                    <Files className="w-4 h-4" />
                 </button>
            </div>
        </div>

        {/* Center: Redesigned Page Navigation HUD (High Quality Agency Style) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <div className="flex items-center bg-[#18181b] rounded-xl border border-white/10 shadow-2xl ring-1 ring-black/20 p-1 pl-1.5 gap-1">
                
                <button 
                    onClick={() => changePage(-1)} 
                    disabled={pageNumber <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-95"
                >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>
                
                <div className="h-4 w-px bg-white/10 mx-1"></div>

                <form onSubmit={handleInputSubmit} className="flex items-center gap-1.5 group h-7">
                    <input 
                        type="text" 
                        inputMode="numeric"
                        value={pageInput}
                        onChange={handlePageInputChange}
                        onBlur={handleInputBlur}
                        onFocus={(e) => e.target.select()}
                        className="w-10 h-full bg-transparent text-center text-sm font-mono font-medium text-white focus:outline-none focus:bg-white/5 rounded transition-colors p-0 selection:bg-indigo-500/30 placeholder-slate-700 translate-y-[1px]"
                    />
                    <span className="text-slate-600 text-[10px] font-mono select-none translate-y-[1px]">/</span>
                    <span className="text-slate-500 text-xs font-mono font-medium min-w-[24px] select-none translate-y-[1px]">{numPages}</span>
                </form>

                <div className="h-4 w-px bg-white/10 mx-1"></div>

                <button 
                    onClick={() => changePage(1)} 
                    disabled={pageNumber >= numPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-95"
                >
                    <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
            </div>
        </div>

        {/* Right: Zoom Controls & Sidebar Toggle */}
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-[#18181b] rounded-lg border border-white/5 p-1 shadow-sm">
              <button onClick={() => zoom(-0.1)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-colors active:scale-95"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="w-12 text-center text-[10px] font-mono font-semibold text-slate-300 select-none">{Math.round(scale * 100)}%</span>
              <button onClick={() => zoom(0.1)} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-colors active:scale-95"><ZoomIn className="w-3.5 h-3.5" /></button>
           </div>

           <div className="h-5 w-px bg-white/10" />

           <button 
                onClick={onToggleSidebar} 
                className={`p-2 rounded-lg transition-all duration-200 border ${isSidebarOpen ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}
                title="Toggle Sidebar"
            >
                <PanelRight className="w-4.5 h-4.5" />
            </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative bg-[#0c0c0e] p-8 custom-scrollbar scroll-smooth"
      >
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-[#0c0c0e]/50 backdrop-blur-sm">
                <div className="bg-[#18181b] px-8 py-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin relative z-10" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 tracking-widest uppercase">Rendering Document</span>
                </div>
            </div>
        )}
        
        {error && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="w-10 h-10 mb-4 text-red-500/50" />
                <p className="text-sm font-medium">{error}</p>
            </div>
        )}

        {!isLoading && !error && pdfDoc && (
            <div className="flex flex-col items-center min-h-full w-full pb-20">
                {viewMode === 'single' ? (
                    // SINGLE PAGE MODE
                    <PDFPage 
                        key={`single-${pageNumber}`}
                        pdfDoc={pdfDoc}
                        pageNum={pageNumber}
                        scale={scale}
                        hotspots={hotspots.filter(h => h.pageNumber === pageNumber)}
                        onLinkClick={onLinkClick}
                        isVisible={true}
                        registerPageRef={() => {}}
                    />
                ) : (
                    // CONTINUOUS SCROLL MODE
                    Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                        <PDFPage
                            key={`scroll-${pageNum}`}
                            pdfDoc={pdfDoc}
                            pageNum={pageNum}
                            scale={scale}
                            hotspots={hotspots.filter(h => h.pageNumber === pageNum)}
                            onLinkClick={onLinkClick}
                            isVisible={true} // In a real app, use intersection to toggle this true/false for virtual scrolling
                            registerPageRef={registerPageRef}
                        />
                    ))
                )}
            </div>
        )}
      </div>
    </div>
  );
};