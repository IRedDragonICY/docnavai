
import { GoogleGenAI, Chat, Type, FunctionDeclaration, Tool, Part } from "@google/genai";
import { NoteReference, LinkHotspot, AgentLogEntry, SectionLink, AgentTask, ProcessedDocument, TokenUsage } from "../types";
import { renderPageAsImage, renderDebugSnapshot, extractTextFromPages } from "./pdfUtils";

// --- LOGGING UTILS ---

const createLog = (
  type: AgentLogEntry['type'], 
  message: string, 
  details?: string, 
  codeBlock?: string,
  output?: string, 
  visualEvidence?: string
): AgentLogEntry => ({
  id: Math.random().toString(36).substr(2, 9),
  timestamp: Date.now(),
  type,
  message,
  details,
  codeBlock,
  output,
  visualEvidence
});

// --- MCP-STYLE TOOL DEFINITIONS ---

// 1. Structure Mapper (Text-Based)
const mapStructureSchema: FunctionDeclaration = {
  name: "map_document_structure_from_text",
  description: "Maps the document sections to their ACTUAL PHYSICAL PDF PAGE INDICES based on text analysis.",
  parameters: {
      type: Type.OBJECT,
      properties: {
          toc_physical_page: { type: Type.INTEGER, description: "The physical page index where the Table of Contents is found." },
          financial_position_physical_page: { type: Type.INTEGER, description: "The physical page index where the 'Statement of Financial Position' (Neraca) actually starts." },
          financial_position_printed_page_number: { type: Type.INTEGER, description: "The PRINTED page number (footer) of the Financial Position page. Used to calculate offset." },
          notes_start_physical_page: { type: Type.INTEGER, description: "The physical page index where 'Notes to Financial Statements' begins." },
          notes_end_physical_page: { type: Type.INTEGER, description: "The physical page index where the Notes section ends." }
      },
      required: ["toc_physical_page", "financial_position_physical_page", "financial_position_printed_page_number", "notes_start_physical_page"]
  }
};

// 2. Note Indexer (Text-Based)
const indexNotesSchema: FunctionDeclaration = {
  name: "index_document_notes",
  description: "Scans the text of the 'Notes to Financial Statements' section to map Note Numbers to their Physical Page Indices.",
  parameters: {
      type: Type.OBJECT,
      properties: {
          notes_mapping: {
              type: Type.ARRAY,
              description: "List of mappings from Note Number to Physical Page.",
              items: {
                  type: Type.OBJECT,
                  properties: {
                      note_number: { type: Type.STRING, description: "The Note Number (e.g. '2e', '4', '33')." },
                      physical_page_index: { type: Type.INTEGER, description: "The physical PDF page index where this Note is defined." }
                  }
              }
          }
      },
      required: ["notes_mapping"]
  }
};

// 3. Report Hotspots Tool (Vision-Based)
const reportHotspotsSchema: FunctionDeclaration = {
  name: "report_navigation_items",
  description: "Reports the 2D bounding boxes of detected items (Notes or TOC Links) on a specific page.",
  parameters: {
      type: Type.OBJECT,
      properties: {
          page_number: { type: Type.INTEGER, description: "The page number being analyzed." },
          items: {
              type: Type.ARRAY,
              description: "List of detected items.",
              items: {
                  type: Type.OBJECT,
                  properties: {
                      text_content: { type: Type.STRING, description: "The text content inside the box." },
                      target_reference: { type: Type.STRING, description: "The Note Number (e.g. '4', '2e') or Page Number." },
                      type: { type: Type.STRING, enum: ["NOTE_REF", "TOC_LINK"], description: "The type of item." },
                      box_2d: { 
                          type: Type.ARRAY,
                          items: { type: Type.INTEGER },
                          description: "The 2D bounding box [ymin, xmin, ymax, xmax] normalized to 0-1000."
                      }
                  },
                  required: ["text_content", "target_reference", "type", "box_2d"]
              }
          }
      },
      required: ["page_number", "items"]
  }
};

const tools: Tool[] = [{ functionDeclarations: [mapStructureSchema, indexNotesSchema, reportHotspotsSchema] }];

// --- HELPER: RETRY WITH BACKOFF ---
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota'))) {
            console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

// --- AGENT ORCHESTRATION ---

export const createDocumentChatSession = async (
  apiKey: string,
  file: File, 
  totalPages: number, 
  modelId: string = 'gemini-2.5-flash'
): Promise<Chat> => {
  
  // Initialize Gemini Client with Specific Key
  const ai = new GoogleGenAI({ apiKey });

  // SYSTEM PROMPT: SMART NAVIGATOR WORKFLOW
  const systemInstruction = `
You are a Document Navigation Agent. You follow a strict 3-Phase Workflow:

PHASE 1: THE LIBRARIAN (Structure Mapping)
*   **Input:** Raw text of the first 50 pages.
*   **Task:** Find the Physical Page Index of the TOC, Balance Sheet, and Notes.
*   **Crucial:** Find the "Printed Page Number" (Footer) of the Balance Sheet to calculate the PDF Offset.

PHASE 2: THE CARTOGRAPHER (Note Indexing)
*   **Input:** Raw text of the ENTIRE Notes section (Start to End of Document).
*   **Task:** Create a precise index. You are looking for NOTE DEFINITIONS (Headers), not references.
*   **Example:** If you see "30. FINANCIAL RISK MANAGEMENT" on Page 90, map Note "30" -> Page 90.
*   **Tool:** Use 'index_document_notes' to save this map.

PHASE 3: THE SURVEYOR (Computer Vision)
*   **Input:** Images of specific pages (TOC & Financial Tables).
*   **Task:** Detect "Note Reference Numbers" (e.g., '2e', '4') or TOC Page numbers.
*   **Constraint:** Output 2D bounding boxes [ymin, xmin, ymax, xmax] normalized to 0-1000.
*   **CRITICAL RULE (ATOMIC ITEMS):** If a cell contains "3, 10", return SEPARATE BOXES for "3" and "10". Do NOT group them.
*   **VERIFICATION:** After reporting, you will receive a snapshot with your boxes. You MUST Verify alignment.
  `;

  const chat = ai.chats.create({
    model: modelId,
    config: {
      systemInstruction,
      tools: tools,
      temperature: 0.0, // Deterministic
      thinkingConfig: {
        includeThoughts: true // Enable thought signatures and summaries
      }
    }
  });

  return chat;
};

export const driveAgentAnalysis = async (
  chat: Chat, 
  file: File, 
  totalPages: number,
  modelId: string,
  onPartialUpdate: (logs: AgentLogEntry[], tasks: AgentTask[], hotspots?: LinkHotspot[], notes?: NoteReference[], sectionLinks?: SectionLink[], tokenUsage?: TokenUsage) => void,
  signal?: AbortSignal,
  resumeState?: {
      logs: AgentLogEntry[];
      tasks: AgentTask[];
      hotspots: LinkHotspot[];
      notes: NoteReference[];
      sectionLinks: SectionLink[];
      tokenUsage?: TokenUsage;
  }
): Promise<ProcessedDocument> => {
  
  // Rehydrate or Initialize State
  let logs: AgentLogEntry[] = resumeState?.logs || [];
  let tasks: AgentTask[] = resumeState?.tasks || [];
  let globalHotspots: LinkHotspot[] = resumeState?.hotspots || [];
  let globalNotes: NoteReference[] = resumeState?.notes || [];
  let globalSectionLinks: SectionLink[] = resumeState?.sectionLinks || [];
  
  // Initialize Token Tracking with IMMUTABLE updates pattern
  let globalTokenUsage: TokenUsage = resumeState?.tokenUsage || {
      promptTokens: 0,
      candidatesTokens: 0,
      totalTokens: 0,
      totalCalls: 0
  };
  
  let struct = {
      tocPage: 0,
      finPosPage: 0, // Physical Page
      finPosPrintedPage: 0, // Footer Page
      notesStart: 0,
      notesEnd: 0
  };

  let globalPageOffset = 0; // Calculated: Physical - Printed
  const globalNoteIndex = new Map<string, number>(); // Note Number -> Physical Page

  // --- STATE REHYDRATION LOGIC ---
  if (resumeState) {
      const tocLink = globalSectionLinks.find(l => l.type === 'TOC');
      if (tocLink) struct.tocPage = tocLink.page;
      
      const finLink = globalSectionLinks.find(l => l.type === 'STATEMENT');
      if (finLink) struct.finPosPage = finLink.page;
      
      const notesLink = globalSectionLinks.find(l => l.type === 'SECTION');
      if (notesLink) struct.notesStart = notesLink.page;

      globalNotes.forEach(n => {
          globalNoteIndex.set(n.noteNumber, n.definitionPage);
      });
  }

  const notifyUpdate = () => {
     // Pass a FRESH object copy of usage to ensure React triggers a re-render
     onPartialUpdate(logs, tasks, globalHotspots, globalNotes, globalSectionLinks, { ...globalTokenUsage });
  };

  const addLog = (type: AgentLogEntry['type'], msg: string, details?: string, code?: string, output?: string, visual?: string) => {
    logs = [...logs, createLog(type, msg, details, code, output, visual)];
    notifyUpdate();
  };

  const upsertTask = (id: string, label: string, status: AgentTask['status']) => {
    const existing = tasks.find(t => t.id === id);
    if (existing) {
        tasks = tasks.map(t => t.id === id ? { ...t, status } : t);
    } else {
        tasks = [...tasks, { id, label, status }];
    }
    notifyUpdate();
  };

  // Helper to update usage from response IMMUTABLY
  const updateUsage = (usageMetadata: any) => {
      if (usageMetadata) {
          // Create a NEW object reference
          globalTokenUsage = {
              promptTokens: globalTokenUsage.promptTokens + (usageMetadata.promptTokenCount || 0),
              candidatesTokens: globalTokenUsage.candidatesTokens + (usageMetadata.candidatesTokenCount || 0),
              totalTokens: globalTokenUsage.totalTokens + (usageMetadata.totalTokenCount || 0),
              totalCalls: globalTokenUsage.totalCalls
          };
          notifyUpdate();
      }
  };

  const incrementCallCount = () => {
      globalTokenUsage = {
          ...globalTokenUsage,
          totalCalls: globalTokenUsage.totalCalls + 1
      };
      notifyUpdate();
  };

  // --- VISUAL VERIFICATION SUB-ROUTINE ---
  const verifyAndRefineHotspots = async (pageNum: number, initialItems: any[]): Promise<LinkHotspot[]> => {
      let currentHotspots: LinkHotspot[] = initialItems.map(item => ({
          pageNumber: pageNum,
          noteNumber: item.target_reference,
          box: item.box_2d,
          verificationText: item.text_content,
          label: item.type,
          targetPage: 0
      }));

      const snapshotBase64 = await renderDebugSnapshot(file, pageNum, currentHotspots);
      
      addLog('ACTION', `Verifying ${currentHotspots.length} items on Page ${pageNum}...`, "Self-Correction Loop Initiated", undefined, undefined, snapshotBase64);

      const verificationPrompt = `
      I have drawn the boxes you requested (Red/Cyan boxes). Look at the image.
      
      Are these boxes PERFECTLY aligned with the text? 
      - If YES, reply with: "VERIFIED".
      - If NO, reply with a JSON list of CORRECTED boxes.
      
      STRICT: Ensure "3, 10" is definitely split.
      `;

      try {
        incrementCallCount(); // Tracking API Call
        const result = await retryWithBackoff(() => chat.sendMessage({
            message: [
                { text: verificationPrompt },
                { inlineData: { mimeType: 'image/jpeg', data: snapshotBase64 } }
            ]
        }));
        
        updateUsage(result.usageMetadata);

        const fc = result.functionCalls?.[0];
        if (fc && fc.name === 'report_navigation_items') {
            const refinedItems: any[] = (fc.args.items as any[]) || [];
            addLog('SUCCESS', `Refined ${refinedItems.length} items`, "Correction applied by AI.");
            return refinedItems.map(item => ({
                pageNumber: pageNum,
                noteNumber: item.target_reference,
                box: item.box_2d,
                verificationText: item.text_content,
                label: item.type,
                targetPage: 0
            }));
        }
      } catch (e: any) {
          addLog('WARNING', 'Verification step skipped due to API error', e.message);
      }

      addLog('SUCCESS', `Verified`, "Using initial findings.");
      return currentHotspots;
  };


  // --- AGENT LOOP EXECUTOR (STREAMING & RETRY) ---
  const executeAgentLoop = async (
    inputContent: (string | Part)[], 
    contextDescription: string,
    maxLoops: number = 3
  ) => {
    if (signal?.aborted) throw new Error("Analysis aborted by user.");

    addLog('THOUGHT', `Analyzing: ${contextDescription}`);
    
    let loopCount = 0;
    let nextInput = inputContent;
    let currentFunctionCalls: any[] = [];

    // Initial Call
    try {
        incrementCallCount(); // Track Request
        const result = await retryWithBackoff(() => chat.sendMessageStream({ message: nextInput }));
        
        let fullText = "";
        let accumulatedThought = "";
        
        for await (const chunk of result) {
            if (signal?.aborted) break;
            
            // Capture Usage Chunk
            if (chunk.usageMetadata) {
                updateUsage(chunk.usageMetadata);
            }

            const parts = chunk.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.thought) {
                    accumulatedThought += part.text;
                    const lastLog = logs[logs.length - 1];
                    if (lastLog && lastLog.type === 'THOUGHT') {
                        logs[logs.length - 1].output = accumulatedThought;
                        logs[logs.length - 1].isThinking = true;
                        notifyUpdate();
                    } else {
                        addLog('THOUGHT', "Thinking...", undefined, undefined, accumulatedThought);
                        logs[logs.length - 1].isThinking = true;
                    }
                }
                if (part.text) fullText += part.text;
            }
            if (chunk.functionCalls) currentFunctionCalls.push(...chunk.functionCalls);
        }

        const finalLog = logs[logs.length - 1];
        if (finalLog && finalLog.type === 'THOUGHT') {
            logs[logs.length - 1].isThinking = false;
            notifyUpdate();
        }

    } catch (error: any) {
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
             addLog('ERROR', 'Rate Limit Exceeded. Pausing analysis...', 'You can resume this session.');
             throw new Error("RATE_LIMIT_EXCEEDED");
        }
        throw error;
    }
    
    // Tool Loop
    while (currentFunctionCalls.length > 0 && loopCount < maxLoops) {
        loopCount++;
        if (signal?.aborted) break;

        const functionCall = currentFunctionCalls[0];
        const { name, args } = functionCall;
        
        addLog('TOOL', `Calling: ${name}`, JSON.stringify(args, null, 2));

        let toolResponse: any = { status: "success" };

        if (name === 'map_document_structure_from_text') {
             struct.tocPage = Number(args.toc_physical_page) || 0;
             struct.finPosPage = Number(args.financial_position_physical_page) || 0;
             struct.finPosPrintedPage = Number(args.financial_position_printed_page_number) || 0;
             struct.notesStart = Number(args.notes_start_physical_page) || 0;
             struct.notesEnd = Number(args.notes_end_physical_page) || (struct.notesStart + 20);

             if (struct.finPosPage > 0 && struct.finPosPrintedPage > 0) {
                 globalPageOffset = struct.finPosPage - struct.finPosPrintedPage;
                 addLog('SYSTEM', `Page Offset Calculated: ${globalPageOffset}`, `(Physical ${struct.finPosPage} - Printed ${struct.finPosPrintedPage})`);
             }

             if (struct.tocPage > 0) globalSectionLinks.push({ title: "Table of Contents", page: struct.tocPage, type: 'TOC' });
             if (struct.finPosPage > 0) globalSectionLinks.push({ title: "Financial Position", page: struct.finPosPage, type: 'STATEMENT' });
             if (struct.notesStart > 0) globalSectionLinks.push({ title: "Notes to Financials", page: struct.notesStart, type: 'SECTION' });

             addLog('SUCCESS', `Structure Mapped`, `TOC: Pg${struct.tocPage}, Financials: Pg${struct.finPosPage}, Offset: ${globalPageOffset}`);
        } 
        else if (name === 'index_document_notes') {
            const mappings = (args.notes_mapping as any[]) || [];
            let count = 0;
            mappings.forEach(m => {
                if (m.note_number && m.physical_page_index) {
                    globalNoteIndex.set(m.note_number.toString(), Number(m.physical_page_index));
                    if (!globalNotes.some(n => n.noteNumber === m.note_number.toString())) {
                        globalNotes.push({
                            id: `note_${m.note_number}`,
                            noteNumber: m.note_number.toString(),
                            title: `Note ${m.note_number}`,
                            description: `Defined on Page ${m.physical_page_index}`,
                            definitionPage: Number(m.physical_page_index),
                            foundOnPage: Number(m.physical_page_index)
                        });
                        count++;
                    }
                }
            });
            addLog('SUCCESS', `Indexed ${count} Notes`, `Map created from Note Text.`);
            notifyUpdate();
        }
        else if (name === 'report_navigation_items') {
            const pageNum = Number(args.page_number);
            const rawItems: any[] = (args.items as any[]) || [];
            
            const invalidItems = rawItems.filter(item => {
                const text = item.text_content || "";
                return /[,;]/.test(text); 
            });

            if (invalidItems.length > 0) {
                 const badExample = invalidItems[0].text_content;
                 toolResponse = { 
                    status: "error", 
                    message: `Validation Failed: Item '${badExample}' contains multiple values. You MUST split grouped numbers into separate bounding boxes. Resubmit.`
                 };
                 addLog('WARNING', `AI attempted to group items: "${badExample}". Requesting split...`);
            } else {
                const validRawItems = rawItems.filter(item => {
                    const [ymin, xmin, ymax, xmax] = item.box_2d;
                    const centerY = (ymin + ymax) / 2;
                    if (centerY > 920) return false; 
                    if (centerY < 40) return false;
                    return true;
                });

                const verifiedHotspots = await verifyAndRefineHotspots(pageNum, validRawItems);

                globalHotspots = globalHotspots.filter(h => h.pageNumber !== pageNum); 

                const finalHotspots: LinkHotspot[] = verifiedHotspots.map(h => {
                    let targetPage: number | undefined;
                    const ref = h.noteNumber;

                    if (h.label === 'TOC_LINK') {
                        const printedPage = parseInt(ref);
                        if (!isNaN(printedPage)) {
                            targetPage = printedPage + globalPageOffset;
                        }
                    } else if (h.label === 'NOTE_REF') {
                        targetPage = globalNoteIndex.get(ref);
                        if (!targetPage) {
                             const simpleRef = ref.replace(/[^a-zA-Z0-9]/g, '');
                             targetPage = globalNoteIndex.get(simpleRef);
                        }
                    }
                    return { ...h, targetPage };
                });

                globalHotspots = [...globalHotspots, ...finalHotspots];
                toolResponse = { status: "processed", count: finalHotspots.length };
                notifyUpdate();
            }
        }

        addLog('THOUGHT', `Analyzing tool response...`);
        
        try {
            incrementCallCount(); // Track Request
            const nextResult = await retryWithBackoff(() => chat.sendMessageStream({
                message: [{
                    functionResponse: {
                        name: name,
                        response: toolResponse
                    }
                }]
            }));

            let accumulatedThought = "";
            let nextFunctionCalls: any[] = [];
            
            for await (const chunk of nextResult) {
                if (chunk.usageMetadata) {
                    updateUsage(chunk.usageMetadata);
                }

                const parts = chunk.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                    if (part.thought) {
                        accumulatedThought += part.text;
                        const lastLog = logs[logs.length - 1];
                        if (lastLog && lastLog.type === 'THOUGHT') {
                            logs[logs.length - 1].output = accumulatedThought;
                            logs[logs.length - 1].isThinking = true;
                            notifyUpdate();
                        } else {
                            addLog('THOUGHT', "Thinking...", undefined, undefined, accumulatedThought);
                            logs[logs.length - 1].isThinking = true;
                        }
                    }
                }
                if (chunk.functionCalls) nextFunctionCalls.push(...chunk.functionCalls);
            }
            
            const endLog = logs[logs.length - 1];
            if (endLog && endLog.type === 'THOUGHT') {
                logs[logs.length - 1].isThinking = false;
                notifyUpdate();
            }

            currentFunctionCalls = nextFunctionCalls;

        } catch (error: any) {
            if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
                 addLog('ERROR', 'Rate Limit Exceeded. Pausing analysis...', 'You can resume this session.');
                 throw new Error("RATE_LIMIT_EXCEEDED");
            }
            throw error;
        }
    }
  };

  // --- EXECUTION FLOW ---
  try {
    const phase1Task = tasks.find(t => t.id === 'text_scan');
    if (phase1Task?.status === 'completed' && struct.finPosPage > 0) {
        addLog('SYSTEM', 'Skipping Phase 1 (Structure already mapped).');
    } else {
        upsertTask('text_scan', 'Phase 1: Text Analysis & Structure', 'running');
        const TEXT_SCAN_LIMIT = Math.min(50, totalPages);
        const textContent = await extractTextFromPages(file, 1, TEXT_SCAN_LIMIT);
        addLog('SYSTEM', `Extracted text from first ${TEXT_SCAN_LIMIT} pages.`);
        await executeAgentLoop(
            [
                { text: `Here is the text content of the first ${TEXT_SCAN_LIMIT} pages.
                TASK 1: Map the Structure.
                - Find 'Daftar Isi' (TOC) Physical Page.
                - Find 'Laporan Posisi Keuangan' (Financial Position) Physical Page.
                - **CRITICAL**: Find the PRINTED page number (footer) of the Financial Position page to calculate offset.
                - Find 'Catatan atas Laporan Keuangan' (Notes) Start Page.
                Call 'map_document_structure_from_text'.` },
                { text: textContent }
            ],
            "Structural Text Analysis"
        );
        upsertTask('text_scan', 'Structure & Index Ready', 'completed');
    }

    if (struct.notesStart > 0) {
        const phase2Task = tasks.find(t => t.id === 'note_indexing');
        if (phase2Task?.status === 'verified' && globalNoteIndex.size > 0) {
            addLog('SYSTEM', 'Skipping Phase 2 (Notes already indexed).');
        } else {
            upsertTask('note_indexing', 'Phase 2: Indexing Notes...', 'running');
            const notesEnd = totalPages; 
            const notesText = await extractTextFromPages(file, struct.notesStart, notesEnd);
            addLog('SYSTEM', `Extracted Note Text (Page ${struct.notesStart} - ${notesEnd}) for Indexing.`);
            await executeAgentLoop(
                [
                    { text: `Here is the full text of the 'Notes to Financial Statements' (Pages ${struct.notesStart}-${notesEnd}).
                    TASK 2: Index the Notes.
                    - You are looking for NOTE DEFINITIONS (Headers).
                    - Examples: "30. FINANCIAL RISK MANAGEMENT", "Catatan 15. ASET TETAP".
                    - Map Note "2" -> Physical Page Index.
                    Call 'index_document_notes' with the complete mapping.` },
                    { text: notesText }
                ],
                "Note Indexing Analysis"
            );
            upsertTask('note_indexing', 'Notes Indexed', 'verified');
        }
    }

    const pagesToScan: number[] = [];
    if (struct.tocPage > 0) pagesToScan.push(struct.tocPage);
    if (struct.finPosPage > 0) {
        for (let i = 0; i < 5; i++) {
            const p = struct.finPosPage + i;
            if (p < struct.notesStart) pagesToScan.push(p);
        }
    }

    const allCandidates = [...new Set(pagesToScan)].sort((a, b) => a - b);
    const queue = allCandidates.filter(p => {
        const t = tasks.find(t => t.id === `vis_${p}`);
        return !t || t.status !== 'verified';
    });

    if (queue.length === 0 && allCandidates.length > 0) {
        addLog('SUCCESS', 'All target pages already analyzed.');
    } else {
        if (queue.length === 0) {
             addLog('WARNING', "Could not find financial pages. Fallback to scanning pages 1-5.");
             queue.push(1, 2, 3, 4, 5);
        }
        const CONCURRENCY = 3;
        for (let i = 0; i < queue.length; i += CONCURRENCY) {
            if (signal?.aborted) break;
            const chunk = queue.slice(i, i + CONCURRENCY);
            const promises = chunk.map(async (pageNum) => {
                const taskId = `vis_${pageNum}`;
                const isTOC = pageNum === struct.tocPage;
                upsertTask(taskId, isTOC ? `Mapping TOC (Pg ${pageNum})` : `Scanning Financials (Pg ${pageNum})`, 'running');
                const { base64 } = await renderPageAsImage(file, pageNum);
                const prompt = isTOC
                    ? `Table of Contents (Page ${pageNum}). Detect 'Page Numbers'. Return box_2d.`
                    : `Financial Statement (Page ${pageNum}). Detect 'Notes' column refs (e.g. '2e', '4', '30'). Return box_2d. SPLIT grouped items (e.g. '3, 4').`;
                await executeAgentLoop(
                    [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/jpeg', data: base64 } }
                    ],
                    `Visual Analysis of Page ${pageNum}`
                );
                upsertTask(taskId, isTOC ? `TOC Mapped` : `Financials Scanned`, 'verified');
            });
            await Promise.all(promises);
        }
    }

    addLog('SUCCESS', 'Analysis Complete', `Found ${globalHotspots.length} navigation points. Offset: ${globalPageOffset}.`);
    
    return {
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        notes: globalNotes,
        hotspots: globalHotspots,
        sectionLinks: globalSectionLinks,
        analysisSummary: `Analysis complete. Indexed ${globalNotes.length} notes.`,
        tocPages: [struct.tocPage],
        aiModel: modelId,
        extractionStrategy: "Tri-Phase with Verification",
        pageOffset: globalPageOffset,
        tokenUsage: globalTokenUsage
    };

  } catch (error: any) {
      if (error.message === "Analysis aborted by user.") throw error;
      if (error.message === "RATE_LIMIT_EXCEEDED") throw error;
      addLog('ERROR', 'Analysis Failed', error.message);
      throw error;
  }
};
