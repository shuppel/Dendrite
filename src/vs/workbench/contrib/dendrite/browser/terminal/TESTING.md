# Terminal Velocity - Manual Testing Guide

Quick reference for hands-on testing of Era 4 features.

## Pre-Test Setup

```bash
# Terminal 1: Watch for changes
npm run watch

# Terminal 2: Launch IDE
./scripts/code.sh
```

**In VS Code:**
1. Open integrated terminal: `` Ctrl+` ``
2. Open Settings: `Ctrl+,`
3. Search: `dendrite.terminal`

## Test Matrix

### 1. Feature Toggle: `dendrite.terminal.smoothCursor`

| Action | Expected | Status |
|--------|----------|--------|
| Set to `true` | Cursor overlay appears, animates smoothly | ☐ |
| Set to `false` | Native cursor restored, overlay hidden | ☐ |
| Toggle true→false→true | No flicker, smooth transitions | ☐ |

### 2. Animation Duration: `dendrite.terminal.cursorPhysics.duration`

| Value | Expected Feel | Status |
|-------|---------------|--------|
| 20ms | Snappy, minimal trail, responsive | ☐ |
| 80ms | Balanced, smooth default feel | ☐ |
| 200ms | Floaty, noticeable lag/drift | ☐ |
| Change value | Settings apply immediately, no restart | ☐ |

### 3. Easing: `dendrite.terminal.cursorPhysics.easing`

| Value | Expected Behavior | Status |
|-------|-------------------|--------|
| `linear` | Constant speed interpolation | ☐ |
| `ease-out` | Fast start, slow finish (recommended) | ☐ |
| `ease-in-out` | Smooth acceleration/deceleration | ☐ |
| Visual difference visible | Especially with longer durations (150-200ms) | ☐ |

### 4. GPU Acceleration: `dendrite.terminal.forceGPU`

| Action | Verification | Status |
|--------|--------------|--------|
| Set to `true` | DevTools Layers: see `.dendrite-smooth-cursor` composited | ☐ |
| Set to `false` | DOM fallback works, rendering continues | ☐ |
| Toggle on/off | Smooth transition, no artifacts | ☐ |
| Check task manager | Memory usage visible when ON | ☐ |

### 5. Target FPS: `dendrite.terminal.targetFPS`

| Value | Expected | Status |
|-------|----------|--------|
| 30fps | Visibly choppier animation | ☐ |
| 60fps | Smooth standard animation | ☐ |
| 120fps | Extra smooth on high-refresh displays | ☐ |
| DevTools Performance | Frame timing accurate to target | ☐ |

## Scenario Tests

### Scenario 1: Rapid Typing
```bash
# Type quickly (100+ WPM) for 10 seconds
abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890
```
**Expected:** Cursor maintains 60 FPS, no stutter, responsive feel
**Status:** ☐

### Scenario 2: Vim Navigation
```bash
# In vim or with hjkl navigation
# Press hjkl rapidly for 10 seconds
```
**Expected:** Smooth cursor trails movement, fluid animation
**Status:** ☐

### Scenario 3: Tab Completion
```bash
# Type command and press TAB multiple times
ls -la /usr/local/bin/
```
**Expected:** No lag when completion popup appears
**Status:** ☐

### Scenario 4: Heavy Syntax Highlighting
```bash
# Scroll through large file with syntax highlighting
# Can paste large JSON or log file
```
**Expected:** Cursor remains smooth during heavy render load
**Status:** ☐

### Scenario 5: Scrollback Navigation
```bash
# Scroll up/down while cursor active
# Use Page Up/Down or scrollbar
```
**Expected:** Cursor position correctly tracked, no jitter
**Status:** ☐

## Performance Validation

### Frame Rate Check
- DevTools Performance tab (F12 → Performance)
- Record 10 seconds of cursor movement
- Check: Average FPS should be ≥ 60

**Measured FPS:** ________  Status: ☐

### Input Latency
- Use DevTools Performance markers
- Measure keystroke → cursor update → visual update
- Target: < 16ms

**Measured Latency:** ________ ms  Status: ☐

### Memory Check
- DevTools Memory tab
- Heap size before: ________ MB
- Heap size after 5 min: ________ MB
- **No memory leaks** (heap stable)

**Memory Stable:** ☐

## Cursor Appearance

### Block Cursor (Recommended)
```json
"terminal.integrated.cursorStyle": "block"
```
- **Should render as:** Highlighted box with border outline
- **Color source:** `terminalCursor.background` and `terminalCursor.foreground`
- **Status:** ☐

### Bar Cursor (Thin vertical line)
```json
"terminal.integrated.cursorStyle": "bar"
```
- **Should render as:** Thin animated vertical line
- **Status:** ☐

### Underline Cursor (Bottom line)
```json
"terminal.integrated.cursorStyle": "underline"
```
- **Should render as:** Animated line at cell bottom
- **Status:** ☐

## Pass/Fail Criteria

### ✅ PASS if:
- [ ] Cursor animates smoothly in all scenarios
- [ ] All 5 config parameters work correctly
- [ ] Visual motion feels fluid (no stuttering/jank)
- [ ] Performance ≥ 60 FPS
- [ ] Input latency < 16ms
- [ ] No memory leaks over 5 min
- [ ] Settings apply immediately
- [ ] Cursor shape matches terminal style

### ❌ FAIL if:
- [ ] Cursor stutters or has visible jank
- [ ] FPS drops below 60
- [ ] Input latency exceeds 16ms
- [ ] Memory leaks detected
- [ ] Settings don't apply without restart
- [ ] Cursor rendering incorrect

## Notes & Issues

```
[Space for notes or observed issues]


```

## Related Documentation

- [Terminal Velocity README](README.md)
- [CATS Specification](../../../../../docs/build/cats/cats.velocity.dendrite.yaml)
- [BuildBook](../../../../../docs/build/buildbook/bldbk.velocity.dendrite.yaml)
