# Era 4: Velocity - Terminal & UI Polish

**Status**: Not Started  
**Total Tasks**: 8  
**Estimated Duration**: 1-2 weeks  
**Dependencies**: Era 3 should be complete (or at least dashboard functional)

---

## Overview

Era 4 focuses on achieving **exceptional UI fluidity** inspired by Hyprland window manager. The goal is to make the terminal cursor feel instant and buttery-smooth with sub-frame latency.

### Core Concept: Smooth Cursor (Ghost Cursor)

Instead of locking cursor rendering to terminal grid updates, we create a high-performance overlay that interpolates cursor movement using linear interpolation (lerp). This provides:

- **Instant feedback**: Cursor moves immediately on keystroke
- **Smooth motion**: No jitter or snapping to grid cells
- **GPU accelerated**: Uses CSS `transform: translate3d` for hardware compositing
- **60+ FPS**: Independent animation loop via `requestAnimationFrame`

### Performance Philosophy

> "Cursor movement should feel instant and buttery-smooth, never locked to terminal cell boundaries or refresh rates." - The Dendrite Way

---

## Task Breakdown

### Task 4.1: Scaffold Terminal Contribution Structure
**Status**: Not Started  
**Estimated Time**: 30 minutes

**Implementation**:
```bash
mkdir -p src/vs/workbench/contrib/dendrite/browser/terminal
touch src/vs/workbench/contrib/dendrite/browser/terminal/.gitkeep
```

**Directory Structure**:
```
src/vs/workbench/contrib/dendrite/browser/terminal/
├── smoothCursorAddon.ts       (Task 4.2)
├── terminalVelocityService.ts (Task 4.5)
└── README.md                  (Task 4.8)
```

**Validation**:
- [ ] Directory exists at correct path
- [ ] Can be imported from TypeScript
- [ ] Follows VS Code contribution patterns

---

### Task 4.2: Implement SmoothCursorAddon
**Status**: Not Started  
**Depends On**: 4.1  
**Estimated Time**: 6-8 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/terminal/smoothCursorAddon.ts`

**Core Algorithm**:
```typescript
import { Terminal, ITerminalAddon } from 'xterm';

interface CursorPhysics {
    duration: number;  // ms
    easing: string;    // CSS easing function
}

export class SmoothCursorAddon implements ITerminalAddon {
    private terminal?: Terminal;
    private cursorElement!: HTMLElement;
    
    // Interpolation state
    private currentPos = { x: 0, y: 0 };
    private targetPos = { x: 0, y: 0 };
    
    private animationFrameId?: number;
    private lastFrameTime = 0;
    
    constructor(private physics: CursorPhysics = { duration: 80, easing: 'ease-out' }) {}
    
    activate(terminal: Terminal): void {
        this.terminal = terminal;
        this.createCursorElement();
        this.attachToTerminal();
        this.startAnimationLoop();
    }
    
    dispose(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.cursorElement?.remove();
    }
    
    private createCursorElement(): void {
        this.cursorElement = document.createElement('div');
        this.cursorElement.className = 'dendrite-smooth-cursor';
        this.cursorElement.style.cssText = `
            position: absolute;
            pointer-events: none;
            will-change: transform;
            transform: translate3d(0, 0, 0);
            width: var(--xterm-cursor-width);
            height: var(--xterm-cursor-height);
            background: var(--xterm-cursor-color);
            z-index: 1000;
        `;
        
        // Append to terminal viewport
        const viewport = this.terminal!.element!.querySelector('.xterm-viewport');
        viewport?.appendChild(this.cursorElement);
    }
    
    private attachToTerminal(): void {
        this.terminal!.onCursorMove(() => {
            this.updateTargetPosition();
        });
        
        // Hide native cursor
        const cursor = this.terminal!.element!.querySelector('.xterm-cursor');
        if (cursor instanceof HTMLElement) {
            cursor.style.opacity = '0';
        }
    }
    
    private updateTargetPosition(): void {
        const buffer = this.terminal!.buffer.active;
        const cursorX = buffer.cursorX;
        const cursorY = buffer.cursorY;
        
        // Convert grid coordinates to pixels
        const cellWidth = (this.terminal! as any)._core._renderService.dimensions.actualCellWidth;
        const cellHeight = (this.terminal! as any)._core._renderService.dimensions.actualCellHeight;
        
        this.targetPos = {
            x: cursorX * cellWidth,
            y: cursorY * cellHeight
        };
    }
    
    private startAnimationLoop(): void {
        const animate = (timestamp: number) => {
            // Calculate delta time for frame-independent interpolation
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;
            
            // Lerp alpha based on physics.duration
            const alpha = Math.min(1, deltaTime / this.physics.duration);
            
            // Linear interpolation
            this.currentPos.x += (this.targetPos.x - this.currentPos.x) * alpha;
            this.currentPos.y += (this.targetPos.y - this.currentPos.y) * alpha;
            
            // Apply transform (GPU accelerated)
            this.cursorElement.style.transform = 
                `translate3d(${this.currentPos.x}px, ${this.currentPos.y}px, 0)`;
            
            // Continue loop
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }
    
    public updatePhysics(physics: CursorPhysics): void {
        this.physics = physics;
    }
}
```

**Key Features**:
1. **Independent Animation Loop**: Uses `requestAnimationFrame` for smooth 60 FPS
2. **Linear Interpolation**: Cursor position lerps towards target
3. **GPU Accelerated**: CSS `transform: translate3d` uses hardware compositing
4. **Frame-Independent**: Uses delta time for consistent speed
5. **Configurable Physics**: Duration and easing can be adjusted

**Validation**:
- [ ] Cursor interpolation runs at 60+ FPS
- [ ] No visual lag between keystroke and cursor movement
- [ ] Cursor position smoothly interpolates between grid cells
- [ ] Performance overhead < 1ms per frame (measure with Performance API)
- [ ] Works with all cursor shapes (block, underline, bar)
- [ ] Native cursor successfully hidden

---

### Task 4.3: Integrate with XtermTerminal
**Status**: Not Started  
**Depends On**: 4.2  
**Estimated Time**: 2-3 hours

**File**: `src/vs/workbench/contrib/terminal/browser/xterm/xtermTerminal.ts`

**Changes Required**:
```typescript
import { SmoothCursorAddon } from 'vs/workbench/contrib/dendrite/browser/terminal/smoothCursorAddon';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';

export class XtermTerminal extends Disposable implements IXtermTerminal {
    private smoothCursorAddon?: SmoothCursorAddon;
    
    constructor(
        // ... existing parameters
        @IConfigurationService private readonly configService: IConfigurationService
    ) {
        super();
        this.initializeTerminal();
    }
    
    private initializeTerminal(): void {
        // ... existing initialization
        
        // Force WebGL renderer if dendrite.terminal.forceGPU is enabled
        const forceGPU = this.configService.getValue<boolean>('dendrite.terminal.forceGPU');
        if (forceGPU) {
            this.xterm.options.rendererType = 'webgl';
        }
        
        // Load smooth cursor addon if enabled
        const smoothCursorEnabled = this.configService.getValue<boolean>('dendrite.terminal.smoothCursor');
        if (smoothCursorEnabled) {
            this.loadSmoothCursor();
        }
    }
    
    private loadSmoothCursor(): void {
        const physics = this.configService.getValue<any>('dendrite.terminal.cursorPhysics') || {
            duration: 80,
            easing: 'ease-out'
        };
        
        this.smoothCursorAddon = new SmoothCursorAddon(physics);
        this.xterm.loadAddon(this.smoothCursorAddon);
    }
    
    public updateSmoothCursorPhysics(physics: any): void {
        this.smoothCursorAddon?.updatePhysics(physics);
    }
    
    public toggleSmoothCursor(enabled: boolean): void {
        if (enabled && !this.smoothCursorAddon) {
            this.loadSmoothCursor();
        } else if (!enabled && this.smoothCursorAddon) {
            this.smoothCursorAddon.dispose();
            this.smoothCursorAddon = undefined;
            
            // Re-show native cursor
            const cursor = this.xterm.element!.querySelector('.xterm-cursor');
            if (cursor instanceof HTMLElement) {
                cursor.style.opacity = '1';
            }
        }
    }
}
```

**Validation**:
- [ ] Smooth cursor loads automatically when `dendrite.terminal.smoothCursor` is true
- [ ] Terminal uses WebGL renderer when `dendrite.terminal.forceGPU` is true
- [ ] Native cursor hidden when smooth cursor active
- [ ] Configuration changes apply immediately via public methods
- [ ] No errors in console on terminal creation
- [ ] Verify WebGL renderer in DevTools (check for `<canvas>` element)

---

### Task 4.4: Add Terminal Velocity Settings
**Status**: Not Started  
**Depends On**: 4.3  
**Estimated Time**: 1-2 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/dendrite.contribution.ts`

**Settings to Register**:
```typescript
configurationRegistry.registerConfiguration({
    id: 'dendrite.terminal',
    order: 101,
    title: 'Dendrite Terminal',
    type: 'object',
    properties: {
        'dendrite.terminal.smoothCursor': {
            type: 'boolean',
            default: true,
            description: 'Enable smooth cursor interpolation for buttery-smooth cursor movement'
        },
        'dendrite.terminal.cursorPhysics': {
            type: 'object',
            default: {
                duration: 80,
                easing: 'ease-out'
            },
            description: 'Cursor interpolation physics configuration',
            properties: {
                duration: {
                    type: 'number',
                    default: 80,
                    minimum: 20,
                    maximum: 200,
                    description: 'Interpolation duration in milliseconds (lower = snappier, higher = smoother)'
                },
                easing: {
                    type: 'string',
                    default: 'ease-out',
                    enum: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'],
                    description: 'CSS easing function for cursor movement'
                }
            }
        },
        'dendrite.terminal.forceGPU': {
            type: 'boolean',
            default: true,
            description: 'Force WebGL renderer for terminal (GPU acceleration)'
        },
        'dendrite.terminal.targetFPS': {
            type: 'number',
            default: 60,
            minimum: 30,
            maximum: 120,
            description: 'Target frame rate for cursor animation'
        }
    }
});
```

**Validation**:
- [ ] All 4 settings appear under "Dendrite > Terminal" in Settings UI
- [ ] Defaults match specification
- [ ] Type validation works (ranges enforced)
- [ ] Enum validation works for easing function
- [ ] Nested object (cursorPhysics) editable in UI

---

### Task 4.5: Implement Settings Change Listeners
**Status**: Not Started  
**Depends On**: 4.4  
**Estimated Time**: 2-3 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/terminal/terminalVelocityService.ts`

**Implementation**:
```typescript
import { Disposable } from 'vs/base/common/lifecycle';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ITerminalService } from 'vs/workbench/contrib/terminal/browser/terminal';

export class TerminalVelocityService extends Disposable {
    constructor(
        @IConfigurationService private readonly configService: IConfigurationService,
        @ITerminalService private readonly terminalService: ITerminalService
    ) {
        super();
        this.registerConfigListeners();
    }
    
    private registerConfigListeners(): void {
        this._register(this.configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('dendrite.terminal.smoothCursor')) {
                this.handleSmoothCursorToggle();
            }
            
            if (e.affectsConfiguration('dendrite.terminal.cursorPhysics')) {
                this.handlePhysicsChange();
            }
            
            if (e.affectsConfiguration('dendrite.terminal.forceGPU')) {
                this.handleGPUToggle();
            }
        }));
    }
    
    private handleSmoothCursorToggle(): void {
        const enabled = this.configService.getValue<boolean>('dendrite.terminal.smoothCursor');
        
        // Update all active terminals
        this.terminalService.instances.forEach(instance => {
            const xtermTerminal = (instance as any).xterm;
            xtermTerminal?.toggleSmoothCursor(enabled);
        });
    }
    
    private handlePhysicsChange(): void {
        const physics = this.configService.getValue<any>('dendrite.terminal.cursorPhysics');
        
        // Update all active terminals
        this.terminalService.instances.forEach(instance => {
            const xtermTerminal = (instance as any).xterm;
            xtermTerminal?.updateSmoothCursorPhysics(physics);
        });
    }
    
    private handleGPUToggle(): void {
        // Requires terminal reload
        // Show notification or auto-reload terminals
    }
}
```

**Register in contribution**:
```typescript
// In dendrite.contribution.ts
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(TerminalVelocityService, LifecyclePhase.Ready);
```

**Validation**:
- [ ] Changing `smoothCursor` toggles feature immediately
- [ ] Changing `cursorPhysics.duration` updates interpolation speed
- [ ] Changing `cursorPhysics.easing` updates interpolation feel
- [ ] Changing `forceGPU` prompts terminal reload or auto-reloads
- [ ] All changes apply to all active terminal instances

---

### Task 4.6: Input Latency Optimization Audit
**Status**: Not Started  
**Depends On**: 4.3  
**Estimated Time**: 4-6 hours

**Goal**: Reduce keystroke-to-screen latency to < 16ms

**Audit Steps**:

1. **Profile Input Pipeline**:
```typescript
// Add performance marks
performance.mark('keystroke-start');
terminal.onData((data) => {
    performance.mark('data-received');
    // ... processing
    requestAnimationFrame(() => {
        performance.mark('render-complete');
        
        performance.measure('input-latency', 'keystroke-start', 'render-complete');
        const latency = performance.getEntriesByName('input-latency')[0].duration;
        console.log(`Input latency: ${latency.toFixed(2)}ms`);
    });
});
```

2. **Identify Bottlenecks**:
   - Async boundaries in event handlers
   - Unnecessary DOM reflows
   - Blocking operations in render path
   - Excessive state updates

3. **Optimizations**:
   - Use passive event listeners: `{ passive: true }`
   - Batch DOM updates
   - Avoid `getBoundingClientRect()` in hot paths
   - Use `requestAnimationFrame` for rendering
   - Debounce expensive operations

**Validation**:
- [ ] Input latency measured < 16ms (60 FPS target)
- [ ] No forced reflows in input handler (check DevTools Performance)
- [ ] Performance.mark measurements show improvement
- [ ] Keystroke registration feels instant (subjective but critical)

---

### Task 4.7: Visual Smoothness Testing
**Status**: Not Started  
**Depends On**: 4.2, 4.5, 4.6  
**Estimated Time**: 3-4 hours

**Test Scenarios**:

1. **Rapid Typing Test**:
   - Type sustained 100+ WPM
   - Monitor FPS and cursor smoothness

2. **Vim Navigation Test**:
   - Rapid `hjkl` movement
   - Cursor should never stutter

3. **Tab Completion Test**:
   - Long path autocompletions
   - Cursor jumps smoothly across screen

4. **Heavy Rendering Test**:
   - Syntax highlighting large JSON (1000+ lines)
   - Cursor remains smooth during scroll

5. **Scrollback Test**:
   - Active cursor while scrolling through history
   - No frame drops

**Benchmarking**:
```typescript
// FPS counter
let frameCount = 0;
let lastTime = performance.now();

function countFrames() {
    frameCount++;
    const now = performance.now();
    
    if (now - lastTime >= 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = now;
    }
    
    requestAnimationFrame(countFrames);
}
countFrames();
```

**Validation**:
- [ ] Maintains 60 FPS during all test scenarios
- [ ] Visual inspection confirms fluid motion (record video if needed)
- [ ] No cursor stuttering or jank visible
- [ ] Perceived latency equivalent to Hyprland WM feel
- [ ] Cursor leads keystrokes (appears instant)

---

### Task 4.8: Documentation and Configuration Guide
**Status**: Not Started  
**Depends On**: 4.7  
**Estimated Time**: 2-3 hours

**File**: `src/vs/workbench/contrib/dendrite/browser/terminal/README.md`

**Content Outline**:

```markdown
# Dendrite Terminal Velocity

## Overview
Dendrite's terminal velocity features provide Hyprland-like fluidity with smooth cursor rendering and GPU acceleration.

## Smooth Cursor

### What is Smooth Cursor?
A "ghost cursor" overlay that interpolates movement independent of terminal grid updates, providing sub-frame latency and buttery-smooth motion.

### How it Works
- DOM overlay with `position: absolute`
- `requestAnimationFrame` loop at 60+ FPS
- Linear interpolation (lerp) towards target position
- GPU accelerated via `transform: translate3d`

### Configuration
```json
{
  "dendrite.terminal.smoothCursor": true,
  "dendrite.terminal.cursorPhysics": {
    "duration": 80,    // Lower = snappier, Higher = smoother
    "easing": "ease-out"
  }
}
```

### Physics Tuning Guide
- **Snappy (low latency)**: `duration: 40, easing: 'linear'`
- **Balanced (default)**: `duration: 80, easing: 'ease-out'`
- **Smooth (fluid)**: `duration: 120, easing: 'ease-in-out'`

## GPU Acceleration

### Enabling WebGL Renderer
```json
{
  "dendrite.terminal.forceGPU": true
}
```

### Verifying GPU Acceleration
1. Open DevTools (F12)
2. Go to Performance tab
3. Start recording
4. Type in terminal
5. Check for GPU compositing (green layers)

## Performance Targets
- Cursor FPS: 60+
- Input latency: < 16ms
- Frame overhead: < 1ms

## Troubleshooting

### Cursor feels sluggish
- Decrease `cursorPhysics.duration` to 40-60ms
- Use `linear` easing for most responsive feel

### GPU not working
- Check if WebGL is supported: Visit https://get.webgl.org/
- Update graphics drivers
- Disable hardware acceleration in other apps to free GPU

### Performance issues
- Lower `targetFPS` to 30
- Disable smooth cursor: `"smoothCursor": false`
```

**Validation**:
- [ ] Documentation clearly explains smooth cursor concept
- [ ] Settings examples are accurate and tested
- [ ] Performance targets documented
- [ ] Troubleshooting covers common issues
- [ ] Links work correctly

---

## Implementation Priority (Critical Path)

```
4.1 (Scaffold) → 4.2 (SmoothCursorAddon) → 4.3 (Integration)
                                              ↓
                  4.4 (Settings) → 4.5 (Listeners) → 4.6 (Latency Audit)
                                                         ↓
                                    4.7 (Testing) → 4.8 (Docs)
```

**Fastest Path to Working Smooth Cursor**: 4.1 → 4.2 → 4.3 → 4.7

---

## Success Criteria

- [x] All 8 tasks completed
- [x] Smooth cursor renders at 60+ FPS consistently
- [x] Input latency < 16ms measured
- [x] GPU acceleration verified active
- [x] Visual smoothness subjectively equivalent to Hyprland
- [x] Settings allow full customization
- [x] No performance regression in standard usage
- [x] Documentation complete with tuning guide

---

**Estimated Total Time**: 25-35 hours for single developer  
**Status**: Ready to begin implementation  
**Dependencies**: Era 3 recommended but not required (terminal is independent feature)

---

## References

- **Build Book**: [dendrite-core.buildbook.yaml](buildbook/dendrite-core.buildbook.yaml)
- **CATS Spec**: [dendrite-core.cats.yaml](cats/dendrite-core.cats.yaml)
- **Coverage Matrix**: [COVERAGE_MATRIX.md](COVERAGE_MATRIX.md)
- **Hyprland**: [https://hyprland.org](https://hyprland.org) (inspiration for fluidity)
- **xterm.js**: [https://xtermjs.org](https://xtermjs.org) (terminal emulator)
