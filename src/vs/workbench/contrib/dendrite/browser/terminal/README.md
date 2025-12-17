# Dendrite Terminal Velocity

Era 4 implementation of Hyprland-inspired terminal fluidity with smooth cursor interpolation and GPU acceleration.

## Quick Start

### Launch the IDE
```bash
# Terminal 1: Watch for TypeScript changes
npm run watch

# Terminal 2: Launch VS Code with compiled changes
./scripts/code.sh
```

### Test the Feature
1. Open integrated terminal (`` Ctrl+` ``)
2. Open Settings (Ctrl+,)
3. Search for `dendrite.terminal`
4. Toggle settings and observe cursor behavior:
   - `dendrite.terminal.smoothCursor` - Enable/disable smooth cursor
   - `dendrite.terminal.cursorPhysics.duration` - Adjust animation speed (20-200ms)
   - `dendrite.terminal.cursorPhysics.easing` - Try different easing curves
   - `dendrite.terminal.targetFPS` - Adjust animation frame rate (30-120)

### Recommended Initial Settings
```json
{
  "terminal.integrated.cursorStyle": "block",
  "terminal.background": "#0f0f0f",
  "terminal.foreground": "#e0e0e0",
  "terminalCursor.foreground": "#00d4ff",
  "terminalCursor.background": "#00d4ff33",
  "dendrite.terminal.smoothCursor": true,
  "dendrite.terminal.cursorPhysics": {
    "duration": 80,
    "easing": "ease-out"
  }
}
```

## Overview

Terminal Velocity provides a smooth, GPU-accelerated cursor animation for the integrated terminal, inspired by the fluid animations in Hyprland combined with retro-minimal design philosophy.

The cursor smoothly interpolates between positions using linear interpolation (lerp) with configurable physics, all wrapped in a distinctive aesthetic that blends:
- **Retro warmth**: 1970s oscilloscope amber glow, mechanical precision
- **Minimal form**: Zero decoration, every element serves a purpose
- **Deep contrast**: High visibility with vintage dark palette
- **Analog soul**: Mechanical blink animation, warm phosphor colors

This isn't just smooth—it's *distinctive*.

## Features

- **Retro-Minimal Aesthetic**: Warm amber glow on deep background, inspired by 1970s oscilloscopes
- **Smooth Cursor Interpolation**: Cursor glides smoothly between positions with mechanical precision
- **Vintage Blink Animation**: Mechanical hesitation effect, not electronic flash
- **Warm Cathode Glow**: Subtle box-shadow creates phosphor tube warmth, not cold neon
- **GPU Acceleration**: Uses CSS `transform: translate3d()` with `will-change` hints for optimal compositing
- **Configurable Physics**: Adjust animation duration and easing to match your preference
- **60+ FPS Animation**: Runs at native refresh rate with configurable FPS targeting
- **Hot-Swappable Settings**: All settings apply immediately without terminal restart
- **Deep Contrast Design**: High visibility with warm dark background and amber accents

## Architecture

### SmoothCursorAddon

The core component is `SmoothCursorAddon`, an xterm.js addon that:

1. Creates a GPU-accelerated overlay element positioned absolutely over the terminal
2. Monitors terminal buffer cursor position changes via `onWriteParsed` and `onData` events
3. Runs a `requestAnimationFrame` animation loop that interpolates the overlay position toward the target
4. Hides the native cursor when active

```
┌─────────────────────────────────────────┐
│ Terminal Element                         │
│  ┌────────────────────────────────────┐ │
│  │ xterm-screen                        │ │
│  │                                     │ │
│  │   text text text text               │ │
│  │   text text█                        │ │ ← Native cursor (hidden)
│  │   ┌───┐                             │ │
│  │   │ ▌ │ ← Smooth cursor overlay     │ │
│  │   └───┘   (GPU-accelerated)         │ │
│  │                                     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Interpolation Algorithm

The addon uses linear interpolation (lerp) with easing:

```typescript
// Per frame:
const alpha = (1000 / physics.duration) / 60;
const easedAlpha = applyEasing(alpha, physics.easing);

currentPos.x += (targetPos.x - currentPos.x) * easedAlpha;
currentPos.y += (targetPos.y - currentPos.y) * easedAlpha;
```

### TerminalVelocityService

Manages configuration and coordinates updates across multiple terminal instances:

- Listens to `dendrite.terminal.*` configuration changes
- Creates and tracks SmoothCursorAddon instances
- Applies settings updates to all registered addons

## Settings

All settings are under the `dendrite.terminal` namespace:

### `dendrite.terminal.smoothCursor`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable smooth cursor interpolation in terminal

### `dendrite.terminal.cursorPhysics`
- **Type**: `object`
- **Default**: `{ duration: 80, easing: "ease-out" }`
- **Description**: Cursor interpolation physics configuration

#### `cursorPhysics.duration`
- **Type**: `number`
- **Range**: `20-200` (milliseconds)
- **Default**: `80`
- **Description**: How long the interpolation takes to complete
  - Lower values (20-40): Snappy, responsive feel
  - Medium values (60-100): Balanced smoothness
  - Higher values (120-200): Floaty, trailing effect

#### `cursorPhysics.easing`
- **Type**: `string`
- **Enum**: `["linear", "ease", "ease-in", "ease-out", "ease-in-out"]`
- **Default**: `"ease-out"`
- **Description**: CSS-style easing function
  - `linear`: Constant speed
  - `ease-out`: Fast start, slow finish (recommended)
  - `ease-in`: Slow start, fast finish
  - `ease-in-out`: Smooth acceleration and deceleration

### `dendrite.terminal.forceGPU`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Force WebGL renderer for terminal (GPU acceleration)

### `dendrite.terminal.targetFPS`
- **Type**: `number`
- **Range**: `30-120`
- **Default**: `60`
- **Description**: Target frame rate for cursor animation
  - 30: Lower CPU usage, visible choppiness
  - 60: Standard smooth animation
  - 120: Extra smooth on high refresh displays

## Theme Recommendations

For the best visual experience with Terminal Velocity, use a dark theme with good contrast. Here are recommended color settings for a dark terminal:

### Retro-Minimal Terminal Theme (Recommended)

Add these settings to your VS Code `settings.json`:

```json
{
  "workbench.colorTheme": "Visual Studio Code Dark",
  "terminal.integrated.cursorStyle": "block",
  "terminal.background": "#0a0a0a",
  "terminal.foreground": "#f0ebe0",
  "terminalCursor.foreground": "#ffa500",
  "terminalCursor.background": "rgba(255, 165, 0, 0.15)",
  "dendrite.terminal.smoothCursor": true,
  "dendrite.terminal.cursorPhysics": {
    "duration": 80,
    "easing": "ease-out"
  },
  "dendrite.terminal.targetFPS": 60
}
```

**Retro-Minimal Design:**
- **Block cursor style** - Renders as vintage box with warm glow
- **Deep warm black** (#0a0a0a) - Like aged cathode ray tube screen
- **Warm cream text** (#f0ebe0) - Analog warmth, not harsh white
- **Warm amber cursor** (#ffa500) - Phosphor tube yellow-orange
- **Subtle glow effect** - Box-shadow creates vintage warmth (not modern neon)
- **Mechanical blink** - Cursor blinks with smooth ease-in-out (suggests precision machinery)
- **80ms smooth interpolation** - Fast enough to feel responsive, slow enough to feel analog

**The aesthetic:** Like looking at a 1970s oscilloscope terminal—warm, precise, and nostalgic. Zero decoration, pure function and form.

## Configuration Examples

### Snappy & Responsive
```json
{
  "dendrite.terminal.smoothCursor": true,
  "dendrite.terminal.cursorPhysics": {
    "duration": 30,
    "easing": "ease-out"
  },
  "dendrite.terminal.targetFPS": 60
}
```

### Floaty & Smooth
```json
{
  "dendrite.terminal.smoothCursor": true,
  "dendrite.terminal.cursorPhysics": {
    "duration": 150,
    "easing": "ease-in-out"
  },
  "dendrite.terminal.targetFPS": 60
}
```

### High Refresh Rate Display
```json
{
  "dendrite.terminal.smoothCursor": true,
  "dendrite.terminal.cursorPhysics": {
    "duration": 60,
    "easing": "ease-out"
  },
  "dendrite.terminal.targetFPS": 120
}
```

### Power Saving Mode
```json
{
  "dendrite.terminal.smoothCursor": true,
  "dendrite.terminal.cursorPhysics": {
    "duration": 100,
    "easing": "linear"
  },
  "dendrite.terminal.targetFPS": 30
}
```

## Performance Tuning

### Optimal Settings
For best performance:
- Keep `targetFPS` at 60 unless you have a high refresh display
- Use `duration` values between 60-100 for balanced CPU usage
- `ease-out` easing is most efficient

### Debugging Performance
The addon includes built-in performance debugging. In the developer console:

```javascript
// Enable performance logging (logs FPS and frame time every second)
// Access via terminal instance if needed for debugging
```

### GPU Acceleration Verification
To verify GPU acceleration is active:
1. Open DevTools (F12)
2. Go to Layers panel
3. Look for the `.dendrite-smooth-cursor` element
4. It should show as a separate composited layer

### Cursor Appearance

The smooth cursor adapts to your terminal's cursor style setting:

- **Block cursor** (recommended): Full cell highlight with border outline
  ```json
  "terminal.integrated.cursorStyle": "block"
  ```
  Creates the highlighted box effect you want

- **Bar cursor**: Thin vertical line
  ```json
  "terminal.integrated.cursorStyle": "bar"
  ```
  
- **Underline cursor**: Horizontal line at cell bottom
  ```json
  "terminal.integrated.cursorStyle": "underline"
  ```

For best visual effect with Terminal Velocity, **use block cursor style** combined with the dark terminal theme above.

## Troubleshooting

### Cursor not appearing
1. Check that `dendrite.terminal.smoothCursor` is `true`
2. Verify the terminal has focus
3. Try reloading the window (Ctrl+Shift+P > "Reload Window")

### Animation feels laggy
1. Reduce `cursorPhysics.duration` to a lower value
2. Ensure `forceGPU` is `true`
3. Check if other extensions are affecting terminal performance

### Cursor position offset
1. Try resizing the terminal
2. Change font size and change back
3. Toggle `smoothCursor` off and on

### High CPU usage
1. Reduce `targetFPS` to 30 or 60
2. Increase `cursorPhysics.duration` (slower animation = less work)
3. Disable if on battery power

## API Reference

### SmoothCursorAddon

```typescript
class SmoothCursorAddon implements ITerminalAddon {
  // Enable/disable the smooth cursor
  setEnabled(enabled: boolean): void;
  
  // Update physics configuration
  updatePhysics(physics: Partial<CursorPhysics>): void;
  
  // Update target FPS
  updateTargetFPS(fps: number): void;
  
  // Refresh overlay style (call after cursor style change)
  refreshStyle(): void;
  
  // Enable performance debugging
  setDebugPerformance(enabled: boolean): void;
  
  // Current state
  readonly isEnabled: boolean;
  readonly physics: CursorPhysics;
}
```

### CursorPhysics

```typescript
interface CursorPhysics {
  duration: number;  // 20-200 ms
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
```

## Manual Testing Protocol

Follow the comprehensive testing protocol defined in the CATS specification for hands-on validation:

### Testing Checklist

**Config Parameter Tests:**
1. Toggle `dendrite.terminal.smoothCursor` (true/false)
   - ✓ Overlay appears when enabled
   - ✓ Native cursor restored when disabled
   - ✓ No flicker on toggle

2. Test `cursorPhysics.duration` values: 20ms, 80ms, 200ms
   - ✓ 20ms feels snappy
   - ✓ 80ms is balanced
   - ✓ 200ms has noticeable lag
   - ✓ Changes apply immediately

3. Test `cursorPhysics.easing`: linear, ease-out, ease-in-out
   - ✓ Visual differences observable
   - ✓ ease-out recommended for default feel

4. Toggle `dendrite.terminal.forceGPU` (true/false)
   - ✓ WebGL active when true (check DevTools Layers)
   - ✓ DOM fallback when false

5. Test `dendrite.terminal.targetFPS`: 30, 60, 120
   - ✓ 30fps visibly choppier
   - ✓ 60fps smooth standard
   - ✓ 120fps extra smooth on high refresh

**Scenario Tests:**
- [ ] Rapid typing (100+ WPM) - cursor maintains smooth 60 FPS
- [ ] Vim navigation (hjkl) - smooth cursor trails
- [ ] Tab completion - no lag in popup
- [ ] Heavy syntax highlighting - smooth with large files
- [ ] Scrollback with cursor - position correctly tracked

**Pass Criteria:**
- Performance: ≥60 FPS, <16ms input latency, <1ms overhead
- Visual: Fluid motion, no stuttering, correct cursor shape
- Config: Immediate application, proper validation

See `cats.velocity.dendrite:manual_testing` for detailed protocol.

## Files

- `smoothCursorAddon.ts` - Core addon implementation (488 lines)
- `terminalVelocityService.ts` - Configuration management service
- `index.ts` - Module exports
- `README.md` - This documentation

## Related

- [CATS Specification](../../../../../docs/build/cats/cats.velocity.dendrite.yaml)
- [BuildBook](../../../../../docs/build/buildbook/bldbk.velocity.dendrite.yaml)
