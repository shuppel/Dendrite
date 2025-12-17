/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseRenderer } from './baseRenderer.js';
import { HeatmapData, HeatmapCell } from '../../common/types.js';
import * as DOM from '../../../../../base/browser/dom.js';

/**
 * GitHub-style activity heatmap renderer
 * Displays a grid of cells representing activity levels over time
 */
export class HeatmapRenderer extends BaseRenderer {
	private static readonly CELL_SIZE = 11;
	private static readonly CELL_GAP = 3;
	private static readonly LABEL_WIDTH = 30;
	private static readonly DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

	private svg: SVGSVGElement | null = null;
	private tooltip: HTMLElement | null = null;
	private data: HeatmapData | null = null;

	constructor(container: HTMLElement) {
		super(container, 'heatmap-renderer');
		this.createTooltip();
	}

	private createTooltip(): void {
		this.tooltip = DOM.append(this._element, DOM.$('div.heatmap-tooltip'));
		this.tooltip.style.cssText = `
			position: absolute;
			background: var(--vscode-editorHoverWidget-background);
			border: 1px solid var(--vscode-editorHoverWidget-border);
			padding: 4px 8px;
			border-radius: 3px;
			font-size: 11px;
			pointer-events: none;
			opacity: 0;
			transition: opacity 0.15s;
			z-index: 100;
			white-space: nowrap;
		`;
	}

	render(): void {
		if (!this.data) {
			this._element.innerHTML = '<div class="no-data">No activity data yet</div>';
			return;
		}

		const weeks = this.data.weeks || 12;
		const width = HeatmapRenderer.LABEL_WIDTH + (weeks * (HeatmapRenderer.CELL_SIZE + HeatmapRenderer.CELL_GAP));
		const height = 7 * (HeatmapRenderer.CELL_SIZE + HeatmapRenderer.CELL_GAP) + 20;

		// Clear previous SVG
		if (this.svg) {
			this.svg.remove();
		}

		this.svg = this.createSvg(width, height);
		this._element.appendChild(this.svg);

		// Render day labels
		this.renderDayLabels();

		// Render cells
		this.renderCells();

		// Render legend
		this.renderLegend(width);
	}

	private renderDayLabels(): void {
		if (!this.svg) {
			return;
		}

		for (let day = 0; day < 7; day++) {
			const label = HeatmapRenderer.DAY_LABELS[day];
			if (label) {
				const y = day * (HeatmapRenderer.CELL_SIZE + HeatmapRenderer.CELL_GAP) + HeatmapRenderer.CELL_SIZE;
				const text = this.createText(0, y, label, 9);
				text.setAttribute('fill', 'var(--vscode-descriptionForeground)');
				this.svg.appendChild(text);
			}
		}
	}

	private renderCells(): void {
		if (!this.svg || !this.data) {
			return;
		}

		const cellsByPosition = new Map<string, HeatmapCell>();
		for (const cell of this.data.cells) {
			cellsByPosition.set(`${cell.week}-${cell.day}`, cell);
		}

		const weeks = this.data.weeks || 12;
		for (let week = 0; week < weeks; week++) {
			for (let day = 0; day < 7; day++) {
				const cell = cellsByPosition.get(`${week}-${day}`);
				const intensity = cell?.intensity ?? 0;
				const minutes = cell?.raw_minutes ?? 0;

				const x = HeatmapRenderer.LABEL_WIDTH + week * (HeatmapRenderer.CELL_SIZE + HeatmapRenderer.CELL_GAP);
				const y = day * (HeatmapRenderer.CELL_SIZE + HeatmapRenderer.CELL_GAP);

				const rect = this.createRect(x, y, HeatmapRenderer.CELL_SIZE, HeatmapRenderer.CELL_SIZE, this.getIntensityColor(intensity));
				rect.style.cursor = 'pointer';

				// Add hover events
				rect.addEventListener('mouseenter', (e) => this.showTooltip(e, day, week, minutes));
				rect.addEventListener('mouseleave', () => this.hideTooltip());

				this.svg!.appendChild(rect);
			}
		}
	}

	private renderLegend(width: number): void {
		if (!this.svg) {
			return;
		}

		const legendY = 7 * (HeatmapRenderer.CELL_SIZE + HeatmapRenderer.CELL_GAP) + 8;
		const intensities = [0, 0.25, 0.5, 0.75, 1];
		const legendX = width - (intensities.length * (HeatmapRenderer.CELL_SIZE + 2)) - 30;

		// "Less" label
		const lessText = this.createText(legendX - 25, legendY + 9, 'Less', 9);
		lessText.setAttribute('fill', 'var(--vscode-descriptionForeground)');
		this.svg.appendChild(lessText);

		// Legend cells
		for (let i = 0; i < intensities.length; i++) {
			const x = legendX + i * (HeatmapRenderer.CELL_SIZE + 2);
			const rect = this.createRect(x, legendY, HeatmapRenderer.CELL_SIZE, HeatmapRenderer.CELL_SIZE, this.getIntensityColor(intensities[i]));
			this.svg.appendChild(rect);
		}

		// "More" label
		const moreText = this.createText(legendX + intensities.length * (HeatmapRenderer.CELL_SIZE + 2) + 4, legendY + 9, 'More', 9);
		moreText.setAttribute('fill', 'var(--vscode-descriptionForeground)');
		this.svg.appendChild(moreText);
	}

	private showTooltip(event: MouseEvent, day: number, week: number, minutes: number): void {
		if (!this.tooltip) {
			return;
		}

		const date = this.getDateForCell(week, day);
		const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
		const timeStr = minutes > 0 ? this.formatTime(minutes * 60 * 1000) : 'No activity';

		this.tooltip.textContent = `${dateStr}: ${timeStr}`;
		this.tooltip.style.opacity = '1';

		const rect = (event.target as Element).getBoundingClientRect();
		const containerRect = this._element.getBoundingClientRect();
		this.tooltip.style.left = `${rect.left - containerRect.left + HeatmapRenderer.CELL_SIZE / 2}px`;
		this.tooltip.style.top = `${rect.top - containerRect.top - 25}px`;
	}

	private hideTooltip(): void {
		if (this.tooltip) {
			this.tooltip.style.opacity = '0';
		}
	}

	private getDateForCell(week: number, day: number): Date {
		const today = new Date();
		const daysAgo = (this.data?.weeks || 12) * 7 - (week * 7 + day);
		const date = new Date(today);
		date.setDate(today.getDate() - daysAgo);
		return date;
	}

	update(data: unknown): void {
		this.data = data as HeatmapData;
		this.render();
	}

	override dispose(): void {
		if (this.svg) {
			this.svg.remove();
		}
		if (this.tooltip) {
			this.tooltip.remove();
		}
		super.dispose();
	}
}
