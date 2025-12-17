/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { BaseRenderer } from './baseRenderer.js';
import * as DOM from '../../../../../base/browser/dom.js';

/**
 * Data structure for streak display
 */
export interface StreakData {
	currentStreak: number;
	longestStreak: number;
	lastActiveDate: string | null;
	isActiveToday: boolean;
}

/**
 * Streak renderer with numbers and visual fire indicator
 * Shows current streak, longest streak, and motivational progress
 */
export class StreakRenderer extends BaseRenderer {
	private data: StreakData | null = null;

	constructor(container: HTMLElement) {
		super(container, 'streak-renderer');
		this._element.style.cssText = 'display: flex; flex-direction: column; gap: 12px; padding: 8px;';
	}

	render(): void {
		this._element.innerHTML = '';

		if (!this.data) {
			const noData = DOM.append(this._element, DOM.$('div.no-data'));
			noData.textContent = 'Start coding to begin your streak!';
			noData.style.color = 'var(--vscode-descriptionForeground)';
			return;
		}

		// Main streak display
		const mainStreak = DOM.append(this._element, DOM.$('div.main-streak'));
		mainStreak.style.cssText = 'display: flex; align-items: center; gap: 12px;';

		// Fire icon container
		const fireContainer = DOM.append(mainStreak, DOM.$('div.fire-container'));
		fireContainer.style.cssText = 'font-size: 32px; line-height: 1;';
		this.renderFireIcon(fireContainer);

		// Streak numbers
		const numbersContainer = DOM.append(mainStreak, DOM.$('div.numbers-container'));
		numbersContainer.style.cssText = 'display: flex; flex-direction: column;';

		// Current streak
		const currentRow = DOM.append(numbersContainer, DOM.$('div.current-streak-row'));
		currentRow.style.cssText = 'display: flex; align-items: baseline; gap: 4px;';

		const currentNumber = DOM.append(currentRow, DOM.$('span.streak-number'));
		currentNumber.textContent = String(this.data.currentStreak);
		currentNumber.style.cssText = `
			font-size: 28px;
			font-weight: bold;
			color: ${this.getStreakColor(this.data.currentStreak)};
		`;

		const currentLabel = DOM.append(currentRow, DOM.$('span.streak-label'));
		currentLabel.textContent = this.data.currentStreak === 1 ? 'day streak' : 'day streak';
		currentLabel.style.cssText = 'font-size: 14px; color: var(--vscode-descriptionForeground);';

		// Longest streak (if different)
		if (this.data.longestStreak > this.data.currentStreak) {
			const longestRow = DOM.append(numbersContainer, DOM.$('div.longest-streak-row'));
			longestRow.style.cssText = 'display: flex; align-items: baseline; gap: 4px; margin-top: 2px;';

			const longestLabel = DOM.append(longestRow, DOM.$('span.longest-label'));
			longestLabel.textContent = 'Best:';
			longestLabel.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground);';

			const longestNumber = DOM.append(longestRow, DOM.$('span.longest-number'));
			longestNumber.textContent = `${this.data.longestStreak} days`;
			longestNumber.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground);';
		}

		// Status indicator
		this.renderStatusIndicator();

		// Progress to next milestone
		this.renderMilestoneProgress();
	}

	private renderFireIcon(container: HTMLElement): void {
		if (!this.data || this.data.currentStreak === 0) {
			// Empty/gray fire for no streak
			container.innerHTML = this.getFireSvg('var(--vscode-disabledForeground)', 0.5);
		} else if (this.data.currentStreak < 7) {
			// Small flame
			container.innerHTML = this.getFireSvg('#ff6b35', 1);
		} else if (this.data.currentStreak < 30) {
			// Medium flame with glow
			container.innerHTML = this.getFireSvg('#ff4500', 1);
			container.style.filter = 'drop-shadow(0 0 4px rgba(255, 69, 0, 0.5))';
		} else {
			// Large flame with strong glow
			container.innerHTML = this.getFireSvg('#ff0000', 1);
			container.style.filter = 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.7))';
		}
	}

	private getFireSvg(color: string, opacity: number): string {
		return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}">
			<path d="M12 23C16.1421 23 19.5 19.6421 19.5 15.5C19.5 13.5 18.5 11 17 9.5C17 11.5 16 13 14.5 13C15 11.5 15 9.5 14 7C13 4.5 11 3 9 1C9 3.5 8 6 6.5 8C5 10 4.5 12 4.5 15.5C4.5 19.6421 7.85786 23 12 23Z" fill="${color}" stroke="${color}" stroke-width="1"/>
			<path d="M12 23C14.2091 23 16 21.2091 16 19C16 17.5 15 16 14 15C14 16 13.5 17 12.5 17C13 16 12.5 14.5 12 13C11.5 14.5 11 16 11.5 17C10.5 17 10 16 10 15C9 16 8 17.5 8 19C8 21.2091 9.79086 23 12 23Z" fill="#ff9500"/>
		</svg>`;
	}

	private getStreakColor(streak: number): string {
		if (streak === 0) {
			return 'var(--vscode-disabledForeground)';
		} else if (streak < 7) {
			return '#ff6b35';
		} else if (streak < 30) {
			return '#ff4500';
		} else if (streak < 100) {
			return '#ff0000';
		} else {
			return '#ff0000';
		}
	}

	private renderStatusIndicator(): void {
		if (!this.data) {
			return;
		}

		const statusContainer = DOM.append(this._element, DOM.$('div.status-indicator'));
		statusContainer.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 12px;';

		const statusDot = DOM.append(statusContainer, DOM.$('div.status-dot'));
		statusDot.style.cssText = `
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: ${this.data.isActiveToday ? '#39d353' : 'var(--vscode-editorWarning-foreground)'};
		`;

		const statusText = DOM.append(statusContainer, DOM.$('span.status-text'));
		if (this.data.isActiveToday) {
			statusText.textContent = 'Active today - streak secured!';
			statusText.style.color = '#39d353';
		} else if (this.data.currentStreak > 0) {
			statusText.textContent = 'Code today to keep your streak!';
			statusText.style.color = 'var(--vscode-editorWarning-foreground)';
		} else {
			statusText.textContent = 'Start coding to begin a streak';
			statusText.style.color = 'var(--vscode-descriptionForeground)';
		}
	}

	private renderMilestoneProgress(): void {
		if (!this.data || this.data.currentStreak === 0) {
			return;
		}

		const milestones = [7, 14, 30, 60, 100, 365];
		const nextMilestone = milestones.find(m => m > this.data!.currentStreak);

		if (!nextMilestone) {
			// Already past all milestones - show achievement
			const achievement = DOM.append(this._element, DOM.$('div.achievement'));
			achievement.style.cssText = 'font-size: 12px; color: var(--vscode-charts-purple); font-weight: bold;';
			achievement.textContent = 'Legendary streaker! 365+ days!';
			return;
		}

		const progressContainer = DOM.append(this._element, DOM.$('div.milestone-progress'));
		progressContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

		// Label
		const label = DOM.append(progressContainer, DOM.$('div.milestone-label'));
		label.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); display: flex; justify-content: space-between;';

		const labelText = DOM.append(label, DOM.$('span'));
		labelText.textContent = `Next milestone: ${nextMilestone} days`;

		const progress = DOM.append(label, DOM.$('span'));
		progress.textContent = `${this.data.currentStreak}/${nextMilestone}`;

		// Progress bar
		const barContainer = DOM.append(progressContainer, DOM.$('div.progress-bar-container'));
		barContainer.style.cssText = `
			width: 100%;
			height: 6px;
			background: var(--vscode-progressBar-background);
			border-radius: 3px;
			overflow: hidden;
		`;

		const bar = DOM.append(barContainer, DOM.$('div.progress-bar'));
		const percentage = (this.data.currentStreak / nextMilestone) * 100;
		bar.style.cssText = `
			width: ${percentage}%;
			height: 100%;
			background: ${this.getStreakColor(this.data.currentStreak)};
			border-radius: 3px;
			transition: width 0.3s ease;
		`;
	}

	update(data: unknown): void {
		this.data = data as StreakData;
		this.render();
	}

	override dispose(): void {
		super.dispose();
	}
}
