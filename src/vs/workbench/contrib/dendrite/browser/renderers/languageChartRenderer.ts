/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseRenderer } from './baseRenderer.js';
import { LanguageStat } from '../../common/types.js';
import { DefaultLanguageColors } from '../../common/constants.js';
import * as DOM from '../../../../../base/browser/dom.js';

/**
 * Donut chart renderer for language breakdown
 */
export class LanguageChartRenderer extends BaseRenderer {
	private static readonly SIZE = 120;
	private static readonly INNER_RADIUS = 35;
	private static readonly OUTER_RADIUS = 55;

	private svg: SVGSVGElement | null = null;
	private legendContainer: HTMLElement | null = null;
	private data: LanguageStat[] = [];

	constructor(container: HTMLElement) {
		super(container, 'language-chart-renderer');
		this._element.style.display = 'flex';
		this._element.style.alignItems = 'flex-start';
		this._element.style.gap = '16px';
	}

	render(): void {
		this._element.innerHTML = '';

		if (!this.data || this.data.length === 0) {
			const noData = DOM.append(this._element, DOM.$('div.no-data'));
			noData.textContent = 'No language data yet';
			noData.style.color = 'var(--vscode-descriptionForeground)';
			return;
		}

		// Create chart container
		const chartContainer = DOM.append(this._element, DOM.$('div.chart-container'));
		this.renderDonutChart(chartContainer);

		// Create legend container
		this.legendContainer = DOM.append(this._element, DOM.$('div.legend-container'));
		this.legendContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px; font-size: 12px;';
		this.renderLegend();
	}

	private renderDonutChart(container: HTMLElement): void {
		const size = LanguageChartRenderer.SIZE;
		this.svg = this.createSvg(size, size);
		container.appendChild(this.svg);

		const cx = size / 2;
		const cy = size / 2;
		const innerR = LanguageChartRenderer.INNER_RADIUS;
		const outerR = LanguageChartRenderer.OUTER_RADIUS;

		// Calculate total for percentages
		const total = this.data.reduce((sum, lang) => sum + lang.time_ms, 0);
		if (total === 0) {
			return;
		}

		let currentAngle = -Math.PI / 2; // Start at top

		for (const lang of this.data) {
			const percentage = lang.time_ms / total;
			const angle = percentage * 2 * Math.PI;
			const endAngle = currentAngle + angle;

			const path = this.createArcPath(cx, cy, innerR, outerR, currentAngle, endAngle);
			const color = this.getLanguageColor(lang.language);

			const pathEl = this.createPath(path, color);
			pathEl.style.cursor = 'pointer';
			pathEl.style.transition = 'opacity 0.15s';

			// Hover effects
			pathEl.addEventListener('mouseenter', () => {
				pathEl.style.opacity = '0.8';
			});
			pathEl.addEventListener('mouseleave', () => {
				pathEl.style.opacity = '1';
			});

			this.svg!.appendChild(pathEl);
			currentAngle = endAngle;
		}

		// Center text - total time
		const totalTime = this.formatTime(total);
		const centerText = this.createText(cx, cy + 4, totalTime, 14);
		centerText.setAttribute('text-anchor', 'middle');
		centerText.setAttribute('font-weight', 'bold');
		this.svg.appendChild(centerText);
	}

	private createArcPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number): string {
		const startOuterX = cx + outerR * Math.cos(startAngle);
		const startOuterY = cy + outerR * Math.sin(startAngle);
		const endOuterX = cx + outerR * Math.cos(endAngle);
		const endOuterY = cy + outerR * Math.sin(endAngle);
		const startInnerX = cx + innerR * Math.cos(endAngle);
		const startInnerY = cy + innerR * Math.sin(endAngle);
		const endInnerX = cx + innerR * Math.cos(startAngle);
		const endInnerY = cy + innerR * Math.sin(startAngle);

		const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

		return [
			`M ${startOuterX} ${startOuterY}`,
			`A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuterX} ${endOuterY}`,
			`L ${startInnerX} ${startInnerY}`,
			`A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInnerX} ${endInnerY}`,
			'Z'
		].join(' ');
	}

	private renderLegend(): void {
		if (!this.legendContainer) {
			return;
		}

		const total = this.data.reduce((sum, lang) => sum + lang.time_ms, 0);

		// Show top 5 languages
		const topLanguages = this.data.slice(0, 5);

		for (const lang of topLanguages) {
			const percentage = total > 0 ? ((lang.time_ms / total) * 100).toFixed(1) : '0';
			const item = DOM.append(this.legendContainer, DOM.$('div.legend-item'));
			item.style.cssText = 'display: flex; align-items: center; gap: 6px;';

			// Color dot
			const dot = DOM.append(item, DOM.$('div.color-dot'));
			dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background: ${this.getLanguageColor(lang.language)};`;

			// Language name
			const name = DOM.append(item, DOM.$('span.lang-name'));
			name.textContent = lang.language;
			name.style.cssText = 'flex: 1; color: var(--vscode-foreground);';

			// Percentage
			const pct = DOM.append(item, DOM.$('span.lang-pct'));
			pct.textContent = `${percentage}%`;
			pct.style.cssText = 'color: var(--vscode-descriptionForeground); font-size: 11px;';
		}

		// Show "others" if more than 5
		if (this.data.length > 5) {
			const othersTime = this.data.slice(5).reduce((sum, lang) => sum + lang.time_ms, 0);
			const percentage = total > 0 ? ((othersTime / total) * 100).toFixed(1) : '0';

			const item = DOM.append(this.legendContainer, DOM.$('div.legend-item'));
			item.style.cssText = 'display: flex; align-items: center; gap: 6px;';

			const dot = DOM.append(item, DOM.$('div.color-dot'));
			dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background: ${DefaultLanguageColors.other};`;

			const name = DOM.append(item, DOM.$('span.lang-name'));
			name.textContent = `+${this.data.length - 5} others`;
			name.style.cssText = 'flex: 1; color: var(--vscode-descriptionForeground);';

			const pct = DOM.append(item, DOM.$('span.lang-pct'));
			pct.textContent = `${percentage}%`;
			pct.style.cssText = 'color: var(--vscode-descriptionForeground); font-size: 11px;';
		}
	}

	private getLanguageColor(language: string): string {
		const normalized = language.toLowerCase();
		return DefaultLanguageColors[normalized as keyof typeof DefaultLanguageColors] || DefaultLanguageColors.other;
	}

	update(data: unknown): void {
		this.data = (data as LanguageStat[]) || [];
		// Sort by time descending
		this.data.sort((a, b) => b.time_ms - a.time_ms);
		this.render();
	}

	override dispose(): void {
		if (this.svg) {
			this.svg.remove();
		}
		super.dispose();
	}
}
