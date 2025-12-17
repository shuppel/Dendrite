/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import type { Terminal, ITerminalAddon } from '@xterm/xterm';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { getWindow } from '../../../../../base/browser/dom.js';

/**
 * Cursor physics configuration for smooth interpolation
 */
export interface CursorPhysics {
	/** Interpolation duration in milliseconds (20-200) */
	duration: number;
	/** CSS easing function */
	easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Options for the SmoothCursorAddon
 */
export interface SmoothCursorOptions {
	/** Enable/disable smooth cursor */
	enabled: boolean;
	/** Cursor physics configuration */
	physics: CursorPhysics;
	/** Target FPS for animation (30-120) */
	targetFPS: number;
}

interface Position {
	x: number;
	y: number;
}

/**
 * Default cursor physics - balanced smoothness
 */
const DEFAULT_PHYSICS: CursorPhysics = {
	duration: 80,
	easing: 'ease-out'
};

/**
 * SmoothCursorAddon - Hyprland-inspired smooth cursor for xterm.js
 *
 * Creates a GPU-accelerated overlay that smoothly interpolates between
 * cursor positions using lerp (linear interpolation).
 *
 * Architecture:
 * - Monitors terminal buffer cursor position changes
 * - Creates a floating DOM overlay with will-change: transform
 * - Uses requestAnimationFrame for 60+ FPS animation
 * - Applies translate3d for GPU acceleration
 */
export class SmoothCursorAddon extends Disposable implements ITerminalAddon {
	private _terminal: Terminal | undefined;
	private _overlay: HTMLElement | undefined;
	private _currentPos: Position = { x: 0, y: 0 };
	private _targetPos: Position = { x: 0, y: 0 };
	private _animationFrameId: number | undefined;
	private _enabled: boolean = true;
	private _physics: CursorPhysics = DEFAULT_PHYSICS;
	private _targetFPS: number = 60;
	private _lastFrameTime: number = 0;
	private _lastCursorX: number = -1;
	private _lastCursorY: number = -1;
	private _cellWidth: number = 0;
	private _cellHeight: number = 0;
	private _debugPerformance: boolean = false;
	private _frameCount: number = 0;
	private _lastPerfLogTime: number = 0;

	constructor(options?: Partial<SmoothCursorOptions>) {
		super();
		if (options) {
			this._enabled = options.enabled ?? true;
			this._physics = options.physics ?? DEFAULT_PHYSICS;
			this._targetFPS = options.targetFPS ?? 60;
		}
	}

	/**
	 * Activate the addon on the terminal
	 */
	activate(terminal: Terminal): void {
		this._terminal = terminal;

		if (!this._enabled) {
			return;
		}

		// Wait for terminal to be fully rendered
		const checkReady = () => {
			if (terminal.element) {
				this._initialize();
			} else {
				requestAnimationFrame(checkReady);
			}
		};
		checkReady();
	}

	/**
	 * Initialize the smooth cursor overlay and animation
	 */
	private _initialize(): void {
		if (!this._terminal?.element) {
			return;
		}

		// Inject retro-minimal blink animation styles if not already present
		this._injectBlinkStyles();

		// Calculate cell dimensions
		this._updateCellDimensions();

		// Create the overlay element
		this._overlay = this._createOverlay();
		
		// Append to the xterm-screen element (where the actual content is rendered)
		// This ensures proper positioning within the terminal viewport
		const screenElement = this._terminal.element?.querySelector('.xterm-screen');
		if (screenElement) {
			screenElement.appendChild(this._overlay);
		} else {
			// Fallback to terminal element if screen not found
			this._terminal.element.appendChild(this._overlay);
		}

		// Enable retro-minimal blink animation
		this._overlay.classList.add('blinking');

		// Hide the native cursor
		this._hideNativeCursor();

		// Set initial position
		this._syncCursorPosition();
		this._currentPos = { ...this._targetPos };
		this._updateOverlayPosition();

		// Listen to write events to detect cursor position changes
		// xterm.js doesn't have a dedicated onCursorMove event, so we track
		// position changes after each write operation
		this._register(this._terminal.onWriteParsed(() => {
			this._syncCursorPosition();
		}));

		// Also sync on data input (user typing)
		this._register(this._terminal.onData(() => {
			// Small delay to allow terminal to process input
			requestAnimationFrame(() => this._syncCursorPosition());
		}));

		// Handle resize
		this._register(this._terminal.onResize(() => {
			this._updateCellDimensions();
			this._syncCursorPosition();
		}));

		// Handle scroll
		this._register(this._terminal.onScroll(() => {
			this._syncCursorPosition();
		}));

		// Start animation loop
		this._startAnimationLoop();
	}

	/**
	 * Inject retro-minimal blink animation styles
	 * Vintage oscilloscope effect with warm colors
	 */
	private _injectBlinkStyles(): void {
		// Check if styles already injected
		if (document.getElementById('dendrite-cursor-styles')) {
			return;
		}

		const style = document.createElement('style');
		style.id = 'dendrite-cursor-styles';
		style.textContent = `
			/* Retro-minimal cursor animations */
			@keyframes vintage-blink {
				0%, 49% { opacity: 1; }
				50%, 100% { opacity: 0; }
			}

			@keyframes warm-glow-pulse {
				0%, 100% {
					box-shadow: 0 0 8px rgba(255, 165, 0, 0.4), inset 0 0 4px rgba(255, 165, 0, 0.2);
				}
				50% {
					box-shadow: 0 0 12px rgba(255, 165, 0, 0.6), inset 0 0 6px rgba(255, 165, 0, 0.3);
				}
			}

			.dendrite-smooth-cursor.blinking {
				animation: vintage-blink 600ms ease-in-out infinite;
			}

			.dendrite-smooth-cursor.pulsing {
				animation: warm-glow-pulse 2s ease-in-out infinite;
			}
		`;
		document.head.appendChild(style);
	}

	/**
	 * Create the GPU-accelerated cursor overlay element
	 * Retro-minimal design: Warm amber glow with vintage block form
	 */
	private _createOverlay(): HTMLElement {
		const overlay = document.createElement('div');
		overlay.className = 'dendrite-smooth-cursor';

		// GPU acceleration hints + base retro-minimal styling
		overlay.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			pointer-events: none;
			z-index: 10;
			will-change: transform;
			transform: translate3d(0, 0, 0);
			contain: strict;
			box-sizing: border-box;
			transition: opacity 100ms ease-in-out;
		`;

		// Apply retro-minimal aesthetic
		this._updateOverlayStyle(overlay);

		return overlay;
	}

	/**
	 * Update overlay visual style - Retro-minimal design
	 * Warm amber glow, deep contrast, vintage oscilloscope aesthetic
	 */
	private _updateOverlayStyle(overlay: HTMLElement): void {
		if (!this._terminal) {
			return;
		}

		const cursorStyle = this._terminal.options.cursorStyle ?? 'block';
		const cursorWidth = this._terminal.options.cursorWidth ?? 1;

		// Retro-minimal color palette (default fallbacks)
		// Warm amber glow (#ffa500) with burnt orange border (#e8945a)
		const glowColor = 'var(--vscode-terminalCursor-foreground, #ffa500)';
		const borderColor = 'var(--vscode-terminalCursor-foreground, #e8945a)';
		const fillColor = 'var(--vscode-terminalCursor-background, rgba(255, 165, 0, 0.15))';

		overlay.style.opacity = '1';

		switch (cursorStyle) {
			case 'block':
				// Retro-minimal block cursor with warm amber glow
				overlay.style.width = `${this._cellWidth}px`;
				overlay.style.height = `${this._cellHeight}px`;
				overlay.style.border = `1px solid ${borderColor}`;
				overlay.style.borderRadius = '0';
				overlay.style.backgroundColor = fillColor;
				// Warm cathode tube glow effect
				overlay.style.boxShadow = `0 0 8px rgba(255, 165, 0, 0.4), inset 0 0 4px rgba(255, 165, 0, 0.2)`;
				break;
			case 'underline':
				// Warm underline cursor
				overlay.style.width = `${this._cellWidth}px`;
				overlay.style.height = '2px';
				overlay.style.marginTop = `${this._cellHeight - 2}px`;
				overlay.style.border = 'none';
				overlay.style.backgroundColor = glowColor;
				overlay.style.boxShadow = `0 0 4px rgba(255, 165, 0, 0.6)`;
				break;
			case 'bar':
				// Warm bar cursor (vertical line)
				overlay.style.width = `${Math.max(cursorWidth, 1)}px`;
				overlay.style.height = `${this._cellHeight}px`;
				overlay.style.border = 'none';
				overlay.style.backgroundColor = glowColor;
				overlay.style.boxShadow = `0 0 6px rgba(255, 165, 0, 0.5)`;
				break;
		}
	}

	/**
	 * Calculate cell dimensions from the terminal
	 */
	private _updateCellDimensions(): void {
		if (!this._terminal?.element) {
			return;
		}

		// Try to get dimensions from xterm's internal core
		const core = (this._terminal as any)._core;
		if (core?._renderService?.dimensions) {
			const dims = core._renderService.dimensions;
			this._cellWidth = dims.css.cell.width;
			this._cellHeight = dims.css.cell.height;
		} else {
			// Fallback: estimate from element size
			const element = this._terminal.element;
			this._cellWidth = element.clientWidth / this._terminal.cols;
			this._cellHeight = element.clientHeight / this._terminal.rows;
		}

		// Update overlay size if it exists
		if (this._overlay) {
			this._updateOverlayStyle(this._overlay);
		}
	}

	/**
	 * Sync target position with terminal cursor
	 * Position relative to terminal viewport, accounting for scroll and padding
	 */
	private _syncCursorPosition(): void {
		if (!this._terminal || !this._overlay) {
			return;
		}

		const buffer = this._terminal.buffer.active;
		const cursorX = buffer.cursorX;
		const cursorY = buffer.cursorY;

		// Only update if cursor actually moved
		if (cursorX === this._lastCursorX && cursorY === this._lastCursorY) {
			return;
		}

		this._lastCursorX = cursorX;
		this._lastCursorY = cursorY;

		// Calculate pixel position within terminal viewport
		const core = (this._terminal as any)._core;
		let paddingLeft = 0;
		let paddingTop = 0;

		// Get canvas position from render service
		if (core?._renderService?.dimensions) {
			paddingLeft = core._renderService.dimensions.css.canvas.left ?? 0;
			paddingTop = core._renderService.dimensions.css.canvas.top ?? 0;
		}

		// Position relative to terminal element
		// cursorY is buffer row, but we need to account for viewport offset (scrollback)
		const viewportY = cursorY - (core?.viewport?.top ?? 0);

		// Only show cursor if it's within visible viewport
		if (viewportY >= 0 && viewportY < this._terminal.rows) {
			this._targetPos = {
				x: paddingLeft + cursorX * this._cellWidth,
				y: paddingTop + viewportY * this._cellHeight
			};
			// Ensure overlay is visible
			this._overlay.style.display = 'block';
		} else {
			// Hide overlay if cursor is outside viewport
			this._overlay.style.display = 'none';
		}
	}

	/**
	 * Hide the native terminal cursor
	 */
	private _hideNativeCursor(): void {
		if (!this._terminal?.element) {
			return;
		}

		// Find and hide the native cursor element
		const cursorLayer = this._terminal.element.querySelector('.xterm-cursor-layer');
		if (cursorLayer instanceof HTMLElement) {
			cursorLayer.style.opacity = '0';
		}
	}

	/**
	 * Show the native terminal cursor
	 */
	private _showNativeCursor(): void {
		if (!this._terminal?.element) {
			return;
		}

		const cursorLayer = this._terminal.element.querySelector('.xterm-cursor-layer');
		if (cursorLayer instanceof HTMLElement) {
			cursorLayer.style.opacity = '';
		}
	}

	/**
	 * Start the animation loop
	 */
	private _startAnimationLoop(): void {
		const frameInterval = 1000 / this._targetFPS;
		const win = this._terminal?.element ? getWindow(this._terminal.element) : window;

		const animate = (timestamp: number) => {
			if (!this._enabled || !this._overlay) {
				return;
			}

			// Throttle to target FPS
			const elapsed = timestamp - this._lastFrameTime;
			if (elapsed >= frameInterval) {
				this._lastFrameTime = timestamp - (elapsed % frameInterval);

				// Performance measurement (when enabled)
				const frameStart = this._debugPerformance ? performance.now() : 0;

				// CRITICAL: Sync cursor position every frame to track actual terminal cursor
				this._syncCursorPosition();
				this._interpolate();
				this._updateOverlayPosition();

				// Log performance metrics periodically
				if (this._debugPerformance) {
					const frameTime = performance.now() - frameStart;
					this._frameCount++;
					if (timestamp - this._lastPerfLogTime >= 1000) {
						console.log(`[SmoothCursor] FPS: ${this._frameCount}, Frame time: ${frameTime.toFixed(2)}ms`);
						this._frameCount = 0;
						this._lastPerfLogTime = timestamp;
					}
				}
			}

			this._animationFrameId = win.requestAnimationFrame(animate);
		};

		this._animationFrameId = win.requestAnimationFrame(animate);
	}

	/**
	 * Interpolate current position toward target using lerp
	 */
	private _interpolate(): void {
		// Calculate alpha based on physics duration
		// Higher duration = slower movement = smaller alpha
		const alpha = Math.min(1, (1000 / this._physics.duration) / 60);

		// Apply easing
		const easedAlpha = this._applyEasing(alpha);

		// Lerp: current += (target - current) * alpha
		const dx = this._targetPos.x - this._currentPos.x;
		const dy = this._targetPos.y - this._currentPos.y;

		// Snap if very close to target (avoid endless micro-movements)
		const threshold = 0.5;
		if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
			this._currentPos.x = this._targetPos.x;
			this._currentPos.y = this._targetPos.y;
		} else {
			this._currentPos.x += dx * easedAlpha;
			this._currentPos.y += dy * easedAlpha;
		}
	}

	/**
	 * Apply easing function to alpha value
	 */
	private _applyEasing(t: number): number {
		switch (this._physics.easing) {
			case 'linear':
				return t;
			case 'ease':
				// Approximate cubic-bezier(0.25, 0.1, 0.25, 1)
				return t < 0.5
					? 2 * t * t
					: 1 - Math.pow(-2 * t + 2, 2) / 2;
			case 'ease-in':
				return t * t;
			case 'ease-out':
				return 1 - (1 - t) * (1 - t);
			case 'ease-in-out':
				return t < 0.5
					? 2 * t * t
					: 1 - Math.pow(-2 * t + 2, 2) / 2;
			default:
				return t;
		}
	}

	/**
	 * Update overlay DOM position using GPU-accelerated transform
	 */
	private _updateOverlayPosition(): void {
		if (!this._overlay) {
			return;
		}

		// Use translate3d for GPU acceleration
		this._overlay.style.transform =
			`translate3d(${this._currentPos.x}px, ${this._currentPos.y}px, 0)`;
	}

	/**
	 * Update cursor physics configuration
	 */
	public updatePhysics(physics: Partial<CursorPhysics>): void {
		this._physics = { ...this._physics, ...physics };
	}

	/**
	 * Update target FPS
	 */
	public updateTargetFPS(fps: number): void {
		this._targetFPS = Math.max(30, Math.min(120, fps));
	}

	/**
	 * Enable or disable the smooth cursor
	 */
	public setEnabled(enabled: boolean): void {
		if (this._enabled === enabled) {
			return;
		}

		this._enabled = enabled;

		if (enabled) {
			if (this._terminal?.element && !this._overlay) {
				this._initialize();
			} else if (this._overlay) {
				this._overlay.style.display = '';
				this._hideNativeCursor();
				this._startAnimationLoop();
			}
		} else {
			if (this._animationFrameId !== undefined) {
				const win = this._terminal?.element ? getWindow(this._terminal.element) : window;
				win.cancelAnimationFrame(this._animationFrameId);
				this._animationFrameId = undefined;
			}
			if (this._overlay) {
				this._overlay.style.display = 'none';
			}
			this._showNativeCursor();
		}
	}

	/**
	 * Check if smooth cursor is enabled
	 */
	public get isEnabled(): boolean {
		return this._enabled;
	}

	/**
	 * Get current physics configuration
	 */
	public get physics(): CursorPhysics {
		return { ...this._physics };
	}

	/**
	 * Force update overlay style (e.g., when cursor style changes)
	 */
	public refreshStyle(): void {
		if (this._overlay) {
			this._updateOverlayStyle(this._overlay);
		}
		this._updateCellDimensions();
	}

	/**
	 * Enable or disable performance debugging
	 * When enabled, logs FPS and frame time to console
	 */
	public setDebugPerformance(enabled: boolean): void {
		this._debugPerformance = enabled;
		if (enabled) {
			this._frameCount = 0;
			this._lastPerfLogTime = performance.now();
			console.log('[SmoothCursor] Performance debugging enabled');
		} else {
			console.log('[SmoothCursor] Performance debugging disabled');
		}
	}

	/**
	 * Dispose and cleanup
	 */
	override dispose(): void {
		// Stop animation
		if (this._animationFrameId !== undefined) {
			const win = this._terminal?.element ? getWindow(this._terminal.element) : window;
			win.cancelAnimationFrame(this._animationFrameId);
			this._animationFrameId = undefined;
		}

		// Remove overlay
		if (this._overlay) {
			this._overlay.remove();
			this._overlay = undefined;
		}

		// Restore native cursor
		this._showNativeCursor();

		this._terminal = undefined;

		super.dispose();
	}
}
