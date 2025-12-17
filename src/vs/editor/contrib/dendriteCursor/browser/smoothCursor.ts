/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../browser/editorBrowser.js';
import { Position } from '../../../common/core/position.js';
import { CursorChangeReason } from '../../../common/cursorEvents.js';
import { EditorOption } from '../../../common/config/editorOptions.js';

/**
 * Smooth cursor movement for Monaco Editor
 * Provides GPU-accelerated lerp-based cursor interpolation with configurable physics
 * Matches terminal velocity aesthetic (retro-minimal warm amber glow)
 */
export class SmoothCursorController extends Disposable {
	private overlay: HTMLDivElement | null = null;
	private currentPos = { x: 0, y: 0 };
	private targetPos = { x: 0, y: 0 };
	private animationFrame: number | null = null;
	private isAnimating = false;
	
	// Physics configuration (matches terminal defaults)
	private physics: {
		duration: number;
		easing: 'linear' | 'ease-out' | 'ease-in' | 'ease-in-out';
	} = {
		duration: 80,  // ms
		easing: 'ease-out'
	};
	
	private readonly targetFPS = 60;
	private readonly frameTime = 1000 / this.targetFPS;
	private lastFrameTime = 0;

	constructor(private readonly editor: ICodeEditor) {
		super();
		this.initialize();
	}

	private initialize(): void {
		const container = this.editor.getDomNode();
		if (!container) {
			return;
		}

		// Create GPU-accelerated overlay cursor
		this.overlay = document.createElement('div');
		this.overlay.className = 'dendrite-smooth-cursor';
		this.overlay.style.cssText = `
			position: absolute;
			pointer-events: none;
			z-index: 1000;
			will-change: transform;
			
			/* Retro-minimal aesthetic */
			background-color: #ffa500;
			border: 1px solid #e8945a;
			box-shadow: 
				0 0 8px rgba(255, 165, 0, 0.6),
				inset 0 0 4px rgba(255, 200, 100, 0.4);
			
			/* Vintage blink animation */
			animation: dendrite-cursor-blink 600ms ease-in-out infinite alternate;
		`;

		// Append to editor's view lines container
		const viewLines = container.querySelector('.view-lines');
		if (viewLines) {
			viewLines.appendChild(this.overlay);
		}

		// Register listeners
		this._register(this.editor.onDidChangeCursorPosition((e) => {
			this.onCursorPositionChanged(e.position, e.reason);
		}));

		// Add CSS keyframes for blink animation
		if (!document.getElementById('dendrite-cursor-styles')) {
			const style = document.createElement('style');
			style.id = 'dendrite-cursor-styles';
			style.textContent = `
				@keyframes dendrite-cursor-blink {
					0%, 40% { opacity: 1; }
					60%, 100% { opacity: 0.3; }
				}
			`;
			document.head.appendChild(style);
		}

		// Initial sync
		this.syncCursorPosition();
	}

	private onCursorPositionChanged(position: Position, reason: CursorChangeReason | undefined): void {
		// Disable animation during typing for snappy feel
		const pauseAnimation = (
			reason === CursorChangeReason.NotSet ||
			reason === CursorChangeReason.ContentFlush
		);

		if (pauseAnimation) {
			// Instant snap during typing
			this.syncCursorPosition();
			this.currentPos = { ...this.targetPos };
			this.stopAnimation();
		} else {
			// Smooth animation for explicit moves (navigation, clicks)
			this.syncCursorPosition();
			this.startAnimation();
		}
	}

	private syncCursorPosition(): void {
		if (!this.overlay) {
			return;
		}

		const position = this.editor.getPosition();
		if (!position) {
			this.overlay.style.display = 'none';
			return;
		}

		// Get cursor visual position
		const coords = this.editor.getScrolledVisiblePosition(position);
		if (!coords) {
			this.overlay.style.display = 'none';
			return;
		}

		// Calculate pixel position
		const layoutInfo = this.editor.getLayoutInfo();
		const lineHeight = this.editor.getOption(EditorOption.lineHeight);
		const fontInfo = this.editor.getOption(EditorOption.fontInfo);
		const charWidth = fontInfo.typicalHalfwidthCharacterWidth;

		this.targetPos = {
			x: coords.left + layoutInfo.contentLeft,
			y: coords.top
		};

		// Update overlay dimensions
		this.overlay.style.width = `${charWidth}px`;
		this.overlay.style.height = `${lineHeight}px`;
		this.overlay.style.display = 'block';
	}

	private startAnimation(): void {
		if (this.isAnimating) {
			return;
		}

		this.isAnimating = true;
		this.lastFrameTime = performance.now();
		this.animate();
	}

	private stopAnimation(): void {
		if (this.animationFrame !== null) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}
		this.isAnimating = false;
	}

	private animate = (): void => {
		const now = performance.now();
		const delta = now - this.lastFrameTime;

		if (delta >= this.frameTime) {
			this.interpolate();
			this.updateOverlayPosition();
			this.lastFrameTime = now - (delta % this.frameTime);
		}

		// Continue if not at target
		const dx = Math.abs(this.targetPos.x - this.currentPos.x);
		const dy = Math.abs(this.targetPos.y - this.currentPos.y);
		
		if (dx < 0.5 && dy < 0.5) {
			// Reached target
			this.currentPos = { ...this.targetPos };
			this.updateOverlayPosition();
			this.stopAnimation();
		} else {
			this.animationFrame = requestAnimationFrame(this.animate);
		}
	};

	private interpolate(): void {
		// Calculate lerp alpha based on physics duration
		const alpha = Math.min(1, (1000 / this.physics.duration) / this.targetFPS);
		const easedAlpha = this.applyEasing(alpha);

		// Interpolate position
		const dx = this.targetPos.x - this.currentPos.x;
		const dy = this.targetPos.y - this.currentPos.y;

		this.currentPos.x += dx * easedAlpha;
		this.currentPos.y += dy * easedAlpha;
	}

	private applyEasing(t: number): number {
		switch (this.physics.easing) {
			case 'linear':
				return t;
			case 'ease-out':
				return 1 - Math.pow(1 - t, 3);
			case 'ease-in':
				return Math.pow(t, 3);
			case 'ease-in-out':
				return t < 0.5
					? 4 * Math.pow(t, 3)
					: 1 - Math.pow(-2 * t + 2, 3) / 2;
			default:
				return t;
		}
	}

	private updateOverlayPosition(): void {
		if (!this.overlay) {
			return;
		}

		// GPU-accelerated transform
		this.overlay.style.transform = `translate3d(${this.currentPos.x}px, ${this.currentPos.y}px, 0)`;
	}

	public override dispose(): void {
		this.stopAnimation();
		if (this.overlay && this.overlay.parentNode) {
			this.overlay.parentNode.removeChild(this.overlay);
		}
		this.overlay = null;
		super.dispose();
	}
}
