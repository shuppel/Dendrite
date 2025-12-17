/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import * as DOM from '../../../../../base/browser/dom.js';

/**
 * Base interface for all Dendrite dashboard renderers
 */
export interface IRenderer extends Disposable {
	readonly element: HTMLElement;
	render(): void;
	update(data: unknown): void;
	layout(width: number, height: number): void;
}

/**
 * Abstract base class for dashboard renderers with common functionality
 */
export abstract class BaseRenderer extends Disposable implements IRenderer {
	protected _element: HTMLElement;

	constructor(
		protected readonly container: HTMLElement,
		protected readonly cssClass: string
	) {
		super();
		this._element = DOM.append(container, DOM.$(`div.dendrite-renderer.${cssClass}`));
	}

	get element(): HTMLElement {
		return this._element;
	}

	abstract render(): void;
	abstract update(data: unknown): void;

	layout(width: number, height: number): void {
		this._element.style.width = `${width}px`;
		this._element.style.height = `${height}px`;
	}

	/**
	 * Create an SVG element with proper namespace
	 */
	protected createSvg(width: number, height: number): SVGSVGElement {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', String(width));
		svg.setAttribute('height', String(height));
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
		return svg;
	}

	/**
	 * Create an SVG rect element
	 */
	protected createRect(x: number, y: number, width: number, height: number, fill: string, rx: number = 2): SVGRectElement {
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(x));
		rect.setAttribute('y', String(y));
		rect.setAttribute('width', String(width));
		rect.setAttribute('height', String(height));
		rect.setAttribute('fill', fill);
		rect.setAttribute('rx', String(rx));
		return rect;
	}

	/**
	 * Create an SVG text element
	 */
	protected createText(x: number, y: number, content: string, fontSize: number = 12): SVGTextElement {
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', String(x));
		text.setAttribute('y', String(y));
		text.setAttribute('font-size', String(fontSize));
		text.setAttribute('fill', 'var(--vscode-foreground)');
		text.textContent = content;
		return text;
	}

	/**
	 * Create an SVG circle element
	 */
	protected createCircle(cx: number, cy: number, r: number, fill: string, stroke?: string): SVGCircleElement {
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('cx', String(cx));
		circle.setAttribute('cy', String(cy));
		circle.setAttribute('r', String(r));
		circle.setAttribute('fill', fill);
		if (stroke) {
			circle.setAttribute('stroke', stroke);
			circle.setAttribute('stroke-width', '2');
		}
		return circle;
	}

	/**
	 * Create an SVG path element
	 */
	protected createPath(d: string, fill: string, stroke?: string): SVGPathElement {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', d);
		path.setAttribute('fill', fill);
		if (stroke) {
			path.setAttribute('stroke', stroke);
			path.setAttribute('stroke-width', '2');
		}
		return path;
	}

	/**
	 * Format milliseconds to human readable string
	 */
	protected formatTime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m`;
		} else {
			return `${seconds}s`;
		}
	}

	/**
	 * Get intensity color for heatmap (GitHub style)
	 */
	protected getIntensityColor(intensity: number): string {
		if (intensity === 0) {
			return 'var(--vscode-editor-background)';
		} else if (intensity < 0.25) {
			return '#0e4429';
		} else if (intensity < 0.5) {
			return '#006d32';
		} else if (intensity < 0.75) {
			return '#26a641';
		} else {
			return '#39d353';
		}
	}
}
