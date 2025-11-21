import * as pdfjsLib from 'pdfjs-dist';
import { LinkHotspot } from '../types';

// Initialize PDF.js worker
const initPDF = () => {
  const lib = (pdfjsLib as any).default || pdfjsLib;
  if (typeof window !== 'undefined' && !lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return lib;
};

const pdfjs = initPDF();

export const getPdfPageCount = async (file: File): Promise<number> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
};

/**
 * Extracts text content from a range of pages.
 */
export const extractTextFromPages = async (file: File, startPage: number, endPage: number): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    let fullText = "";

    const start = Math.max(1, startPage);
    const end = Math.min(totalPages, endPage);

    for (let i = start; i <= end; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += `\n--- [ PAGE ${i} ] ---\n${pageText}\n`;
    }

    return fullText;
  } catch (e) {
    console.error("PDF Text Extraction Failed", e);
    throw new Error(`Failed to read pages ${startPage}-${endPage}`);
  }
};

/**
 * Renders a specific PDF page to a Base64 Image string.
 * ROBOTICS APPROACH: Clean, High-Res, Footer Masked.
 */
export const renderPageAsImage = async (file: File, pageNumber: number, scale = 3.0): Promise<{ base64: string, width: number, height: number }> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error("Could not create canvas context");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  const w = canvas.width;
  const h = canvas.height;
  
  context.save();
  
  // Footer Masking (Crucial for DocNav)
  // We keep this because page numbers confuse the "Note" logic.
  // Mask bottom 8% of page
  const footerY = h * 0.92;
  context.fillStyle = 'rgba(240, 240, 240, 0.95)'; // Almost solid cover
  context.fillRect(0, footerY, w, h - footerY);
  
  context.restore();

  // High quality JPEG
  const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  
  return {
    base64,
    width: viewport.width,
    height: viewport.height
  };
};

/**
 * Batch renders pages for Multi-Image Prompting
 */
export const renderPagesAsImages = async (file: File, pageNumbers: number[]): Promise<{ pageNumber: number, base64: string }[]> => {
    const results = [];
    // Use a lower scale for structural scanning to save tokens/bandwidth
    // 1.5 is enough to read "Table of Contents" headers
    const SCOUT_SCALE = 1.5; 

    for (const pageNum of pageNumbers) {
        const { base64 } = await renderPageAsImage(file, pageNum, SCOUT_SCALE);
        results.push({ pageNumber: pageNum, base64 });
    }
    return results;
};

/**
 * Generates a "Debug Snapshot" for the logs.
 */
export const renderDebugSnapshot = async (file: File, pageNumber: number, hotspots: LinkHotspot[]): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);
    const scale = 2.0; 
    const viewport = page.getViewport({ scale });
  
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return "";
  
    canvas.width = viewport.width;
    canvas.height = viewport.height;
  
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
  
    await page.render(renderContext).promise;
  
    context.save();
    hotspots.forEach(hotspot => {
        const [ymin, xmin, ymax, xmax] = hotspot.box;
        
        const x = (xmin / 1000) * canvas.width;
        const y = (ymin / 1000) * canvas.height;
        const w = ((xmax - xmin) / 1000) * canvas.width;
        const h = ((ymax - ymin) / 1000) * canvas.height;
        
        // Robotics Style: Neon Cyan Box, Thin Stroke
        context.strokeStyle = '#00f0ff';
        context.lineWidth = 2;
        context.strokeRect(x, y, w, h);
        
        // Fill slightly for visibility
        context.fillStyle = 'rgba(0, 240, 255, 0.1)';
        context.fillRect(x, y, w, h);
    });
    context.restore();
  
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
};
