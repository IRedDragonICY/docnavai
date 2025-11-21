
<div align="center">
  
  <!-- PROJECT LOGO / HEADER -->
  <img src="https://img.shields.io/badge/DOCNAV_AI-ENTERPRISE_SUITE-0f172a?style=for-the-badge&logo=google-gemini&logoColor=white&labelColor=4f46e5&height=50" alt="DocNav AI Banner" />
  
  <br />
  <br />

  <!-- DYNAMIC REPO STATS -->
  <div style="display: flex; gap: 10px; justify-content: center;">
    <a href="https://github.com/IRedDragonICY/docnavai/stargazers">
      <img src="https://img.shields.io/github/stars/IRedDragonICY/docnavai?style=for-the-badge&logo=star&color=fbbf24&labelColor=1e293b" alt="Stars">
    </a>
    <a href="https://github.com/IRedDragonICY/docnavai/network/members">
      <img src="https://img.shields.io/github/forks/IRedDragonICY/docnavai?style=for-the-badge&logo=git-fork&color=94a3b8&labelColor=1e293b" alt="Forks">
    </a>
    <a href="https://github.com/IRedDragonICY/docnavai/watchers">
      <img src="https://img.shields.io/github/watchers/IRedDragonICY/docnavai?style=for-the-badge&logo=eye&color=38bdf8&labelColor=1e293b" alt="Watchers">
    </a>
    <a href="https://github.com/IRedDragonICY/docnavai/issues">
      <img src="https://img.shields.io/github/issues/IRedDragonICY/docnavai?style=for-the-badge&logo=github-actions&color=ef4444&labelColor=1e293b" alt="Issues">
    </a>
  </div>
  
  <br />
  <div style="display: flex; gap: 10px; justify-content: center;">
    <img src="https://img.shields.io/badge/VERSION-2.5.0-emerald?style=for-the-badge&labelColor=064e3b" alt="Version">
    <img src="https://img.shields.io/github/license/IRedDragonICY/docnavai?style=for-the-badge&logo=balance-scale&color=3b82f6&labelColor=1e293b" alt="License">
    <img src="https://img.shields.io/badge/MAINTAINED-YES-pink?style=for-the-badge&labelColor=831843" alt="Maintained">
  </div>

  <br />
  <br />

  <h1 style="border-bottom: none; font-weight: 800; font-size: 40px; margin-bottom: 0;">UNIVERSAL DOCUMENT NAVIGATOR</h1>
  <h3 style="border-bottom: none; margin-top: 10px; color: #94a3b8;">Advanced Agentic Analysis Interface</h3>

<img width="1860" height="961" alt="image" src="https://github.com/user-attachments/assets/9de8826b-76bb-4cb5-985e-7abb58768dc6" />
<img width="1371" height="830" alt="image" src="https://github.com/user-attachments/assets/ce06ca1d-7611-4885-a715-acc861afb948" />
<img width="1371" height="823" alt="image" src="https://github.com/user-attachments/assets/0aaef2d0-93c2-4e11-948b-12be8c43ef10" />


  <p style="max-width: 800px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
    <b>DocNav AI</b> is an enterprise-grade intelligence platform engineered to deconstruct complex financial reports and technical documentation. Leveraging <b>Google Gemini 2.5 & 3.0</b> reasoning models, it autonomously maps document structures, indexes semantic definitions, and performs robotic visual verification to create instant, interactive navigation overlays.
  </p>

  <br />
  <br />

  <!-- TECH STACK -->
  <img src="https://img.shields.io/badge/POWERED_BY-STACK-0f172a?style=for-the-badge&logo=layers&logoColor=white&color=1e293b" alt="Tech Stack Header" />
  <br />
  <br />
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,ts,tailwind,vite,gcp,github,figma&theme=dark" alt="Tech Stack Icons" />
  </a>

  <br />
  <br />
</div>

---

## 1. SYSTEM ARCHITECTURE

<img src="https://img.shields.io/badge/ARCHITECTURE-CLIENT_SIDE_AGENT-0f172a?style=for-the-badge&logo=server&logoColor=indigo&color=1e293b" alt="Architecture Badge" />

DocNav AI utilizes a privacy-first, client-side agentic architecture. The application state is managed via a high-performance React 19 core, while heavy reasoning tasks are offloaded to the Google GenAI SDK via ephemeral API calls. All file processing, rendering, and modification occur in the browser's memory buffer to ensure data sovereignty.

| Domain | Technology | Role |
| :--- | :--- | :--- |
| **Core Engine** | ![React](https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61DAFB) | Component Lifecycle & State Orchestration |
| **Logic Layer** | ![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=flat-square&logo=typescript&logoColor=white) | Strict Type Safety & Interface Definitions |
| **AI Model** | ![Gemini](https://img.shields.io/badge/Google_GenAI-8E75B2?style=flat-square&logo=google&logoColor=white) | Multimodal Reasoning, Vision, and Context Analysis |
| **Rendering** | ![PDF.js](https://img.shields.io/badge/PDF.js_Dist-EC1C24?style=flat-square&logo=adobe-acrobat-reader&logoColor=white) | Canvas Rendering, Text Extraction, & Coordinate Mapping |
| **UI System** | ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) | Utility-First Design System & Animations |

---

## 2. AGENTIC WORKFLOW

<img src="https://img.shields.io/badge/WORKFLOW-TRI_PHASE_ANALYSIS-0f172a?style=for-the-badge&logo=git-merge&logoColor=emerald&color=1e293b" alt="Workflow Badge" />

The application follows a strict tri-phase analysis pipeline. This ensures high accuracy by separating structure mapping from content indexing, utilizing specific "Agents" for each task.

```mermaid
graph TD
    subgraph "PHASE 1: THE LIBRARIAN"
    A[Input PDF] -->|Buffer| B[Extract Text Pages 1-50]
    B --> C{Reasoning Model}
    C -->|Structure Scan| D[Map TOC Physical Page]
    C -->|Structure Scan| E[Map Financial Statements]
    C -->|Calc Offset| F[Derive PDF vs Printed Page Offset]
    end

    subgraph "PHASE 2: THE CARTOGRAPHER"
    E --> G[Extract Notes Section Text]
    G --> H{Context Model}
    H -->|Semantic Indexing| I[Map Note ID to Physical Page]
    end

    subgraph "PHASE 3: THE SURVEYOR"
    I --> J[Render High-Res Page Images]
    J --> K{Vision Model}
    K -->|Computer Vision| L[Detect Bounding Boxes]
    L -->|Self-Correction| M[Verify Alignment & Split Groups]
    M --> N[Generate Interactive Overlays]
    end

    style A fill:#1e293b,stroke:#475569,color:#fff
    style C fill:#4338ca,stroke:#6366f1,color:#fff
    style H fill:#4338ca,stroke:#6366f1,color:#fff
    style K fill:#059669,stroke:#10b981,color:#fff
```

---

## 3. ENTERPRISE FEATURES

### <img src="https://img.shields.io/badge/SECURITY-ENCRYPTED_STORAGE-0f172a?style=flat-square&logo=auth0&logoColor=34d399&color=1e293b" alt="Security" />

*   **Local Execution**: PDF files are processed entirely in the browser's memory. No document data is ever uploaded to intermediate servers, ensuring compliance with data privacy standards.
*   **Secure Credential Management**: API keys are stored using encryption in the browser's LocalStorage and injected only at runtime.

### <img src="https://img.shields.io/badge/PERFORMANCE-PARALLEL_COMPUTE-0f172a?style=flat-square&logo=speedtest&logoColor=6366f1&color=1e293b" alt="Performance" />

*   **Batch Processing**: Multi-threaded analysis queue allows for simultaneous processing of multiple complex reports.
*   **Long-Context Architecture**: Utilizes Gemini's 1M+ token window to process entire sections at once, eliminating the need for vector databases (RAG) and reducing hallucination.

### <img src="https://img.shields.io/badge/VISION-ROBOTICS_GRADE-0f172a?style=flat-square&logo=opencv&logoColor=f43f5e&color=1e293b" alt="Vision" />

*   **Precision Detection**: The AI outputs normalized 2D bounding boxes (0-1000 scale) for clickable elements on the canvas.
*   **Visual Feedback Loop**: The system renders debug snapshots with drawn boxes and asks the model to verify its own accuracy before committing changes to the UI.

---

## 4. REPOSITORY ANALYTICS

<div align="center">
 <a href="https://star-history.com/#IRedDragonICY/docnavai&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=IRedDragonICY/docnavai&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=IRedDragonICY/docnavai&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=IRedDragonICY/docnavai&type=Date" />
  </picture>
 </a>
</div>

<br />
<div align="center">
    <a href="https://github.com/IRedDragonICY/docnavai/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=IRedDragonICY/docnavai" alt="Contributors" />
    </a>
</div>

---

## 5. LICENSE

<div align="left">
    <img src="https://img.shields.io/github/license/IRedDragonICY/docnavai?style=for-the-badge&logo=balance-scale&color=3b82f6&labelColor=1e293b" alt="MIT License">
</div>

<br />

Copyright © 2024 **IRedDragonICY**.
<br />
Distributed under the **MIT License**. See `LICENSE` for more information.

<br />
<br />

<div align="center">
  <a href="https://github.com/IRedDragonICY">
    <img src="https://img.shields.io/badge/BUILT_BY-IREDDRAGONICY-0f172a?style=for-the-badge&logo=github&logoColor=white&labelColor=000000" alt="Creator">
  </a>
</div>
