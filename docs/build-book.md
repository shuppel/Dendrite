# Build Book: Dendrite

## Vision

Transform VS Code into **Dendrite**: a privacy-first, learning-centric IDE powered by Rust and WASM. Treats the repository as an active proof of learning, proof of concept, and live portfolio.

---

## Phases

### Phase I: Silence (Noise-Stripping & Privacy)

**Goal:** Sever ties with external services and remove "generic" features.

#### 1. De-Marketplace
- **Action:** Ensure `product.json` has no `extensionsGallery` configuration.
- **Status:** Verified.

#### 2. Privacy (Telemetry Removal)
- **Action:** Verify `product.json` lacks telemetry keys; replace `TelemetryService` with `NullTelemetryService`.
- **Status:** Verified.

#### 3. UI Purge
- **Action:** Remove Extensions viewlet from sidebar.
- **File:** `src/vs/workbench/contrib/extensions/browser/extensions.contribution.ts`
- **Status:** Completed.

---

### Phase II: The Engine (Rust & WASM)

**Goal:** Move core logic to Rust for performance and safety.

#### 1. Infrastructure
- Create Rust workspace: `crates/`
- Initialize `crates/dendrite_engine`
- Configure `wasm-bindgen` for WASM compilation
- **Status:** Completed.

#### 2. Learning Engine Implementation
- Track session statistics (active time, keystrokes, concepts)
- Expose via WASM to TypeScript layer
- **Status:** Scaffolded. Needs `wasm-pack` to build.

#### 3. Text Buffer (Rope)
- Replace Monaco's PieceTree with rope data structure
- Target: Large file performance, memory efficiency
- **Status:** Planned.

#### 4. Search/Indexing
- Learning-aware indexing (concept tagging)
- Semantic search capabilities
- **Status:** Planned.

---

### Phase III: The Journey (New UI)

**Goal:** Replace Marketplace with Portfolio/Learning View.

#### 1. Dendrite View Container
- Register "Journey" view in sidebar
- **Location:** `src/vs/workbench/contrib/dendrite/`
- **Status:** Completed.

#### 2. Dashboard
- Render data from `dendrite_engine`
- Display session heatmap, knowledge graph, skill progression
- **Status:** Pending.

#### 3. Portfolio Export
- Generate shareable proof-of-learning artifacts
- **Status:** Planned.

---

## Technical Specification

### Architecture Overview

```
+-------------------------------------------------------------+
|                        Dendrite IDE                         |
+-------------------------------------------------------------+
|  UI Layer (VS Code Workbench)                               |
|  +---------+ +---------+ +-------------+ +---------------+  |
|  | Editor  | |Terminal | |  Journey    | | AI Assistant  |  |
|  | Pane    | | Pane    | |  Dashboard  | | Panel         |  |
|  +---------+ +---------+ +-------------+ +---------------+  |
+-------------------------------------------------------------+
|  TypeScript Services Layer                                  |
|  +--------------+ +-----------------+ +------------------+  |
|  | Dendrite     | | WASM Bridge     | | Portfolio        |  |
|  | Service      | | Service         | | Service          |  |
|  +--------------+ +-----------------+ +------------------+  |
+-------------------------------------------------------------+
|  Rust/WASM Layer (crates/dendrite_engine)                   |
|  +------------+ +-------------+ +-------------------------+ |
|  | Session    | | Concept     | | Proof-of-Learning       | |
|  | Tracker    | | Extractor   | | Generator               | |
|  +------------+ +-------------+ +-------------------------+ |
|  +------------+ +-------------+                             |
|  | Rope       | | Search      |  (Future)                   |
|  | Buffer     | | Index       |                             |
|  +------------+ +-------------+                             |
+-------------------------------------------------------------+
```

### Rust/WASM Layer

#### dendrite_engine Crate

**Location:** `crates/dendrite_engine/`

**Dependencies:**
- `wasm-bindgen` — JS interop
- `serde` + `serde_json` — Serialization
- `ropey` — Rope data structure (future)

**Exposed API:**
```rust
#[wasm_bindgen]
pub struct DendriteEngine { ... }

#[wasm_bindgen]
impl DendriteEngine {
    pub fn new() -> Self;
    pub fn record_keystroke(&mut self, file_id: &str);
    pub fn record_concept(&mut self, concept: &str, file_id: &str);
    pub fn get_session_stats(&self) -> JsValue;
    pub fn export_proof_of_learning(&self) -> JsValue;
}
```

#### Data Models

**Session Stats:**
```typescript
interface SessionStats {
  activeTimeMs: number;
  keystrokeCount: number;
  filesEdited: string[];
  conceptsTouched: Map<string, number>;
}
```

**Proof of Learning:**
```typescript
interface ProofOfLearning {
  projectId: string;
  generatedAt: string;
  totalSessions: number;
  conceptsMastered: Concept[];
  milestones: Milestone[];
  commitAnnotations: CommitAnnotation[];
}
```

### TypeScript Layer

#### Dendrite Service

**Location:** `src/vs/workbench/services/dendrite/`

Responsibilities:
- Initialize and manage WASM module lifecycle
- Bridge between VS Code events and Rust engine
- Persist learning data to local storage

#### Journey UI Components

**Location:** `src/vs/workbench/contrib/dendrite/browser/`

Components:
- `DendriteViewPaneContainer` — Main sidebar container
- `JourneyDashboardView` — Stats overview
- `SkillTreeView` — Visual concept map
- `PortfolioExportView` — Export controls

### Build System

**WASM Build Pipeline:**
```bash
# scripts/build-rust.sh
wasm-pack build crates/dendrite_engine \
  --target web \
  --out-dir src/vs/workbench/services/dendrite/common/pkg
```

**Integration:**
- Add to `gulpfile.mjs` as pre-build step
- Output: `dendrite_engine.js`, `dendrite_engine_bg.wasm`

---

## Open Questions

1. **Target Languages**: Which languages should concept extraction support in v1?
2. **Portfolio Format**: JSON export? Markdown report? Shareable web page?
3. **AI Integration**: How should the AI model connect? Sidecar? Cloud API?
4. **Skill Tree Taxonomy**: What concept hierarchy to use? Language-specific or universal?
5. **Verification**: Should proof-of-learning be cryptographically signed?

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01 | Fork VS Code over Zed | MIT license allows commercial use; Zed's GPL would require open-sourcing our learning engine |
| 2025-01 | Name: Dendrite | Neural/branching metaphor fits learning-centric vision |
| 2025-01 | Rust/WASM for core engine | Performance, memory safety, portability |
| 2025-01 | No extension marketplace | Opinionated, batteries-included approach |
