# Dendrite Mode-Centric Interface Planning Summary

**Date:** 2025-12-17  
**Version:** 0.4.0  
**Status:** Planning Complete (Eras 5-11), Ready for Implementation

---

## Overview

This document summarizes the comprehensive planning effort for Dendrite's mode-centric interface redesign (Eras 5-10). All planning documents have been created and are ready for implementation.

---

## What Changed

### Vision Shift: From Traditional IDE to 4-Mode Fullscreen System

**Old Vision (Eras 1-8 original):**
- Terminal-first with OpenCode
- Unified workspace with TLDraw, Linear, GitHub
- Marketplace for extensions

**New Vision (Eras 5-11 mode-centric):**
- **4 fullscreen modes** replacing traditional IDE layout
- **Left sidebar for multi-project management** (Era 11)
- **Keyboard-driven** workflow (Cmd+1-4)
- **Mode-specific UI** optimized for each task
- **AI-assisted multi-project workflows**

---

## The 4 Modes

| Mode | Number | Shortcut | Icon | Purpose |
|------|--------|----------|------|---------|
| **AGGREGATOR** | 1 | Cmd+1 | 🖥️ ph-terminal-window | Fullscreen terminal with AI chat & diff viewer |
| **PRECISION** | 2 | Cmd+2 | 💻 ph-code | Fullscreen code editor with smart file tree |
| **PRODUCT** | 3 | Cmd+3 | 📋 ph-kanban | Fullscreen Kanban board (YAML integration) |
| **GROWTH** | 4 | Cmd+4 | 📈 ph-chart-line | Fullscreen dashboard (already implemented!) |

---

## Files Created

### Master Roadmap (Updated)
- `docs/build/rdmp.dendrite.yaml`
  - **Version:** 0.4.0
  - **Eras:** Now includes 11 eras (5-11 are new)
  - **Tasks:** 212 total (49 done, 163 remaining)
  - **Overall completion:** 23%

### Era 5: Mode System Foundation
- **CATS:** `docs/build/cats/cats.modesystem.dendrite.yaml` (19 KB)
- **BuildBook:** `docs/build/buildbook/bldbk.modesystem.dendrite.yaml` (12 KB)
- **Tasks:** 12
- **Purpose:** Mode switcher infrastructure, Phosphor icons, hide legacy UI

### Era 6: PRECISION Mode (Code Editor)
- **CATS:** `docs/build/cats/cats.precision.dendrite.yaml` (16 KB)
- **BuildBook:** `docs/build/buildbook/bldbk.precision.dendrite.yaml` (14 KB)
- **Tasks:** 18
- **Purpose:** Fullscreen Monaco editor with collapsible file tree

### Era 7: AGGREGATOR Mode (Terminal)
- **CATS:** `docs/build/cats/cats.aggregator.dendrite.yaml` (19 KB)
- **BuildBook:** `docs/build/buildbook/bldbk.aggregator.dendrite.yaml` (14 KB)
- **Tasks:** 22
- **Purpose:** Fullscreen terminal with OpenCode, AI chat, diff viewer

### Era 8: PRODUCT Mode (Project Management)
- **CATS:** `docs/build/cats/cats.product.dendrite.yaml` (15 KB)
- **BuildBook:** `docs/build/buildbook/bldbk.product.dendrite.yaml` (16 KB)
- **Tasks:** 28
- **Purpose:** Fullscreen Kanban board with CATS/BuildBook YAML integration

### Era 11: Projects/Workspaces
- **CATS:** `docs/build/cats/cats.projects.dendrite.yaml` (18 KB)
- **BuildBook:** `docs/build/buildbook/bldbk.projects.dendrite.yaml` (10 KB)
- **Tasks:** 15
- **Purpose:** Multi-project management with left sidebar, project switcher, AI context

---

## Task Breakdown by Era

| Era | Name | Tasks | Status | Dependencies |
|-----|------|-------|--------|--------------|
| 1-3 | Core | 42 | ✅ Complete | None |
| 4 | Velocity | 8 | ✅ 87.5% (7/8) | Core |
| **5** | **Mode System** | **12** | 🔜 Not Started | Velocity |
| **6** | **PRECISION** | **18** | 🔜 Not Started | Mode System |
| **7** | **AGGREGATOR** | **22** | 🔜 Not Started | Mode System |
| **8** | **PRODUCT** | **28** | 🔜 Not Started | Mode System |
| 9 | AI Autocomplete | 15 | 💡 Future | PRECISION |
| 10 | DESIGNER | 10 | 💡 Future | PRODUCT |
| **11** | **Projects/Workspaces** | **15** | 🔜 Not Started | Mode System + PRECISION |

**Total:** 212 tasks (49 done, 163 remaining)

---

## Key Design Decisions

### 1. Mode Switcher Design: Option D (Hybrid)
- Minimal top bar (32px)
- Current mode indicator (left)
- 4 mode tabs (center)
- Settings icon (right)
- Cmd+1-4 for direct switching
- Cmd+P for visual mode picker

### 2. Phosphor Icons Migration: Option C (Custom Subset)
- 150 curated icons (core + extended)
- Embedded SVG in CSS/TypeScript
- Fallback to Codicons during transition
- 1 week effort, low risk

### 3. File Tree Design (PRECISION Mode)
- Collapsible sidebar (Cmd+B)
- Smart filtering (hide node_modules, .git by default)
- Virtual scrolling for 10k+ files
- Cmd+P fuzzy finder
- Drag-and-drop support

### 4. OpenCode Integration (AGGREGATOR Mode)
- **Optional** - works without OpenCode
- Graceful fallback to standard terminal
- Startup message if not detected
- AI features require OpenCode

### 5. LLM Backend (AGGREGATOR Mode)
- **Default:** Ollama (open source, local)
- **Optional:** OpenAI, Anthropic Claude
- Configurable via settings

### 6. YAML as Single Source of Truth (PRODUCT Mode)
- CATS and BuildBook files are the source
- Drag-drop cards → updates YAML files
- File watcher auto-refreshes board
- Backups created before writes

### 7. Projects/Workspaces Sidebar (Era 11)
- **Left sidebar** for multi-project management
- **Project switcher** with search (Cmd+Shift+P)
- **Filesystem root** per project
- **Recent projects** list (last 10)
- **AI context** per project (language, framework, description)
- **Project-specific settings** override globals
- **Git detection** and status indicators
- **Visible in all 4 modes**

---

## Performance Targets

| Feature | Target | Notes |
|---------|--------|-------|
| Mode switching | < 200ms | Pre-load modes, keep in memory |
| File tree toggle | < 50ms | Slide animation |
| Fuzzy finder | < 100ms | Debounced search |
| Virtual scroll | 60fps | Large file trees (10k+ files) |
| AI chat toggle | < 200ms | Slide animation |
| Diff viewer render | < 200ms | Large diffs (1000+ lines) |
| Kanban board render | < 500ms | First load (subsequent < 200ms) |
| Card drag | 60fps | Smooth drag-and-drop |
| YAML write | < 100ms | Preserve formatting |
| **Project switching** | **< 300ms** | **Close files, load settings, refresh tree** |
| **Projects sidebar toggle** | **< 50ms** | **Slide animation** |

---

## Implementation Order

### Phase 1: Foundation (Era 5)
**Weeks:** 2-3  
**Critical Path:** Must complete before Eras 6-8

1. Mode switcher infrastructure
2. Phosphor icons migration (150 icons)
3. Hide legacy UI elements
4. Keybindings (Cmd+1-4, Cmd+P)

### Phase 2: Modes (Parallel - Eras 6-8)
**Weeks:** 6-8 (can be parallelized)

**Era 6 - PRECISION (2 weeks):**
- File tree with smart filtering
- Virtual scrolling
- Fuzzy finder
- Mode integration

**Era 7 - AGGREGATOR (3 weeks):**
- OpenCode detection & fallback
- AI chat panel
- LLM service (Ollama, OpenAI, Anthropic)
- Diff viewer with approve/reject

**Era 8 - PRODUCT (3 weeks):**
- Kanban board GUI
- YAML parser/writer
- Drag-drop updates YAML
- Roadmap panel
- Card-to-code jump

### Phase 3: Multi-Project Support (Era 11)
**Weeks:** 2 weeks  
**Can be done in parallel with Eras 6-8 or after**

- Projects sidebar with file tree
- Project switcher with search
- AI context generation per project
- Project-specific settings
- Git detection and status
- Integration with all 4 modes

### Phase 4: Enhancements (Future)
**Era 9 - AI Autocomplete:** Inline suggestions in PRECISION  
**Era 10 - DESIGNER:** TLDraw wireframes (optional)

---

## Architecture Highlights

### Mode Service
```typescript
interface IModeService {
  switchMode(modeId: string): Promise<void>;
  getCurrentMode(): string;
  registerMode(descriptor: ModeDescriptor): IDisposable;
  onDidChangeMode: Event<ModeChangeEvent>;
}
```

### Mode Registry
```typescript
interface ModeDescriptor {
  id: string;
  name: string;
  icon: string;  // Phosphor icon name
  keybinding: string;
  createView(): IModeView;
}
```

### Mode View Lifecycle
```typescript
interface IModeView {
  show(): Promise<void>;  // Activate mode
  hide(): Promise<void>;  // Deactivate mode
}
```

---

## YAML Integration (PRODUCT Mode)

### Files Watched
- `docs/build/rdmp.dendrite.yaml` (roadmap)
- `docs/build/cats/*.yaml` (feature specs)
- `docs/build/buildbook/*.yaml` (task lists)

### Workflow
1. **Read:** Parse YAML → Task models
2. **Display:** Render as Kanban cards
3. **Drag:** User moves card
4. **Write:** Update task status in YAML
5. **Watch:** External changes auto-refresh board

---

## Migration from Legacy Eras

### Deprecated Files
The original Eras 5-8 (terminalux, commitmode, workspace, marketplace) have been **deprecated** in favor of the mode-centric approach:

| Old Era | Old Name | Status | Replaced By |
|---------|----------|--------|-------------|
| 5 (old) | Terminal-First UX | Deprecated | Era 7 (AGGREGATOR) |
| 6 (old) | Code Commit Mode | Deprecated | Integrated into AGGREGATOR/PRECISION |
| 7 (old) | Unified Workspace | Deprecated | Era 8 (PRODUCT) |
| 8 (old) | Marketplace | Deprecated | Deferred to future |

**Files to delete (after confirming):**
- `docs/build/cats/cats.terminalux.dendrite.yaml`
- `docs/build/cats/cats.commitmode.dendrite.yaml`
- `docs/build/cats/cats.workspace.dendrite.yaml`
- `docs/build/cats/cats.marketplace.dendrite.yaml`
- Corresponding BuildBook files

---

## Next Steps

### 1. Review Planning Documents ✅
- [x] Roadmap updated
- [x] CATS specs created (Eras 5-8)
- [x] BuildBook plans created (Eras 5-8)

### 2. Start Implementation
- [ ] Era 5: Mode System Foundation (12 tasks)
- [ ] Era 6: PRECISION Mode (18 tasks)
- [ ] Era 7: AGGREGATOR Mode (22 tasks)
- [ ] Era 8: PRODUCT Mode (28 tasks)

### 3. Commit and Push
```bash
git add docs/build/
git commit -m "Plan: Add Eras 5-10 for mode-centric interface redesign

- Update roadmap to version 0.3.0
- Add Era 5: Mode System Foundation (mode switcher, Phosphor icons)
- Add Era 6: PRECISION Mode (fullscreen code editor)
- Add Era 7: AGGREGATOR Mode (fullscreen terminal with AI)
- Add Era 8: PRODUCT Mode (Kanban project management)
- Deprecate legacy Eras 5-8 (terminal UX, commit mode, workspace, marketplace)
- Total: 197 tasks (80 new tasks for mode-centric interface)"

git push
```

---

## Questions for Consideration

1. **Phosphor Icons:** Proceed with Option C (Custom Subset, 150 icons)? ✅ Yes
2. **OpenCode:** Make it optional with graceful fallback? ✅ Yes
3. **LLM Default:** Use Ollama (open source) as default? ✅ Yes
4. **File Tree:** Hide node_modules, .git by default? ✅ Yes
5. **Mode Switcher:** Use Option D (Hybrid - top bar + Cmd+P)? ✅ Yes
6. **PRODUCT Mode:** Start with Kanban view (can add outline view later)? ✅ Yes

---

## Success Criteria

### Era 5 (Mode System)
- [x] Planning complete
- [ ] Mode switching < 200ms
- [ ] 4 modes registered
- [ ] Phosphor icons integrated
- [ ] Legacy UI hidden

### Era 6 (PRECISION)
- [x] Planning complete
- [ ] File tree with smart filtering
- [ ] Virtual scrolling 60fps
- [ ] Fuzzy finder < 100ms
- [ ] Cmd+2 switches modes

### Era 7 (AGGREGATOR)
- [x] Planning complete
- [ ] OpenCode integration + fallback
- [ ] AI chat functional
- [ ] Diff viewer with approve/reject
- [ ] Cmd+1 switches modes

### Era 8 (PRODUCT)
- [x] Planning complete
- [ ] Kanban board renders < 500ms
- [ ] Drag-drop updates YAML
- [ ] Card-to-code jump works
- [ ] Cmd+3 switches modes

---

## Timeline Estimate

**Phase 1 (Era 5):** 2-3 weeks  
**Phase 2 (Eras 6-8):** 6-8 weeks (parallel development possible)  
**Phase 3 (Polish & Testing):** 1-2 weeks  

**Total:** 11-15 weeks to complete mode-centric interface with multi-project support (Eras 5-8, 11)

---

## Contact & Resources

**Owner:** @shupp  
**Roadmap:** `docs/build/rdmp.dendrite.yaml`  
**Planning Docs:** `docs/build/cats/`, `docs/build/buildbook/`  
**Phosphor Icons:** https://phosphoricons.com/  
**Ollama:** https://ollama.ai/  
**OpenCode:** https://opencode.ai/

---

**Status:** ✅ Planning Complete - Ready for Implementation
