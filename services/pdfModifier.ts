
import { PDFDocument, PDFName, PDFNumber, PDFArray } from 'pdf-lib';
import { LinkHotspot, NoteReference } from '../types';

/**
 * Helper to normalize Note IDs for fuzzy matching.
 * e.g. "Catatan 2e" -> "2e", "2 e" -> "2e"
 */
const normalizeId = (id: string): string => {
  return id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

/**
 * Takes a PDF file buffer and a list of hotspots/notes, and returns a modified PDF Uint8Array
 * with visual highlights and clickable Link Annotations.
 */
export const generateInteractivePDF = async (
  fileBuffer: ArrayBuffer,
  hotspots: LinkHotspot[],
  notes: NoteReference[]
): Promise<Uint8Array> => {
  try {
    // 1. Load into PDF-Lib
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();

    // 2. Create a lookup map for note destinations
    const noteDestinations = new Map<string, number>();
    notes.forEach(note => {
      noteDestinations.set(normalizeId(note.noteNumber), note.definitionPage - 1);
      noteDestinations.set(normalizeId(note.id), note.definitionPage - 1);
    });

    // 3. Iterate through hotspots and add links + highlights
    for (const hotspot of hotspots) {
      const pageIndex = hotspot.pageNumber - 1;
      
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width, height } = page.getSize();
      
      const [rawYmin, rawXmin, rawYmax, rawXmax] = hotspot.box;

      // Safety Padding and Clamping
      const PADDING = 2; 
      
      const xmin = Math.max(0, Math.min(1000, rawXmin));
      const xmax = Math.max(0, Math.min(1000, rawXmax));
      const ymin = Math.max(0, Math.min(1000, rawYmin - PADDING));
      const ymax = Math.max(0, Math.min(1000, rawYmax + PADDING));

      const llx = (xmin / 1000) * width;
      const urx = (xmax / 1000) * width;

      const ury = height - ((ymin / 1000) * height); // Upper Y (Visually Top)
      const lly = height - ((ymax / 1000) * height); // Lower Y (Visually Bottom)

      const targetId = normalizeId(hotspot.noteNumber);
      let targetPageIndex = noteDestinations.get(targetId);

      if (targetPageIndex !== undefined && targetPageIndex >= 0 && targetPageIndex < pages.length) {
        const targetPage = pages[targetPageIndex];
        
        const quadPoints = [
          llx, lly, // Bottom-Left
          urx, lly, // Bottom-Right
          urx, ury, // Top-Right
          llx, ury  // Top-Left
        ];

        // A. Add Visual Highlight
        const highlightDict = pdfDoc.context.obj({
          Type: PDFName.of('Annot'),
          Subtype: PDFName.of('Highlight'),
          Rect: [llx, lly, urx, ury], 
          C: [1, 1, 0], // Yellow
          CA: 0.4, 
          QuadPoints: quadPoints,
          F: 4 
        });
        
        const highlightRef = pdfDoc.context.register(highlightDict);
        page.node.addAnnot(highlightRef);

        // B. Add Clickable Link
        const linkDict = pdfDoc.context.obj({
          Type: PDFName.of('Annot'),
          Subtype: PDFName.of('Link'),
          Rect: [llx, lly, urx, ury],
          Border: [0, 0, 0],
          Dest: [targetPage.ref, PDFName.of('XYZ'), null, page.getSize().height, null], 
          F: 4 
        });

        const linkRef = pdfDoc.context.register(linkDict);
        page.node.addAnnot(linkRef);
      }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    console.error("Failed to generate interactive PDF:", error);
    throw new Error("Could not embed navigation links into PDF.");
  }
};
