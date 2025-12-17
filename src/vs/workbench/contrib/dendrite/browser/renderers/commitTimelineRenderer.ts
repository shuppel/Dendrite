/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseRenderer } from './baseRenderer.js';
import { CommitRef } from '../../common/types.js';
import * as DOM from '../../../../../base/browser/dom.js';

/**
 * Data structure for commit timeline display
 */
export interface CommitTimelineData {
	commits: CommitRef[];
	todayCount: number;
	weekCount: number;
}

/**
 * Commit timeline renderer showing recent commits with visual timeline
 */
export class CommitTimelineRenderer extends BaseRenderer {
	private static readonly MAX_COMMITS_SHOWN = 10;

	private data: CommitTimelineData | null = null;
	private expandedCommits: Set<string> = new Set();

	constructor(container: HTMLElement) {
		super(container, 'commit-timeline-renderer');
		this._element.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
	}

	render(): void {
		this._element.innerHTML = '';

		if (!this.data || this.data.commits.length === 0) {
			const noData = DOM.append(this._element, DOM.$('div.no-data'));
			noData.textContent = 'No commits yet in this session';
			noData.style.color = 'var(--vscode-descriptionForeground)';
			return;
		}

		// Summary header
		this.renderSummary();

		// Timeline
		this.renderTimeline();
	}

	private renderSummary(): void {
		if (!this.data) {
			return;
		}

		const summary = DOM.append(this._element, DOM.$('div.commit-summary'));
		summary.style.cssText = 'display: flex; gap: 16px; font-size: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--vscode-panel-border);';

		// Today count
		const todayItem = DOM.append(summary, DOM.$('div.summary-item'));
		todayItem.style.cssText = 'display: flex; align-items: center; gap: 4px;';

		const todayIcon = DOM.append(todayItem, DOM.$('span.icon'));
		todayIcon.innerHTML = this.getCommitIcon();
		todayIcon.style.cssText = 'display: flex; align-items: center;';

		const todayText = DOM.append(todayItem, DOM.$('span'));
		todayText.textContent = `${this.data.todayCount} today`;
		todayText.style.color = 'var(--vscode-foreground)';

		// Week count
		const weekItem = DOM.append(summary, DOM.$('div.summary-item'));
		weekItem.style.cssText = 'display: flex; align-items: center; gap: 4px;';

		const weekIcon = DOM.append(weekItem, DOM.$('span.icon'));
		weekIcon.innerHTML = this.getCalendarIcon();
		weekIcon.style.cssText = 'display: flex; align-items: center;';

		const weekText = DOM.append(weekItem, DOM.$('span'));
		weekText.textContent = `${this.data.weekCount} this week`;
		weekText.style.color = 'var(--vscode-descriptionForeground)';
	}

	private renderTimeline(): void {
		if (!this.data) {
			return;
		}

		const timeline = DOM.append(this._element, DOM.$('div.timeline'));
		timeline.style.cssText = 'display: flex; flex-direction: column; position: relative; padding-left: 16px;';

		// Timeline line
		const line = DOM.append(timeline, DOM.$('div.timeline-line'));
		line.style.cssText = `
			position: absolute;
			left: 5px;
			top: 4px;
			bottom: 4px;
			width: 2px;
			background: var(--vscode-panel-border);
			border-radius: 1px;
		`;

		// Commits
		const commitsToShow = this.data.commits.slice(0, CommitTimelineRenderer.MAX_COMMITS_SHOWN);

		for (let i = 0; i < commitsToShow.length; i++) {
			const commit = commitsToShow[i];
			const isLast = i === commitsToShow.length - 1;
			this.renderCommitItem(timeline, commit, isLast);
		}

		// "More" indicator
		if (this.data.commits.length > CommitTimelineRenderer.MAX_COMMITS_SHOWN) {
			const moreCount = this.data.commits.length - CommitTimelineRenderer.MAX_COMMITS_SHOWN;
			const moreItem = DOM.append(timeline, DOM.$('div.more-commits'));
			moreItem.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); padding: 8px 0;';
			moreItem.textContent = `+ ${moreCount} more commits`;
		}
	}

	private renderCommitItem(container: HTMLElement, commit: CommitRef, isLast: boolean): void {
		const item = DOM.append(container, DOM.$('div.commit-item'));
		item.style.cssText = `
			display: flex;
			flex-direction: column;
			padding: 8px 0;
			position: relative;
			${!isLast ? 'border-bottom: 1px solid var(--vscode-panel-border);' : ''}
		`;

		// Dot on timeline
		const dot = DOM.append(item, DOM.$('div.timeline-dot'));
		dot.style.cssText = `
			position: absolute;
			left: -14px;
			top: 12px;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--vscode-charts-green);
			border: 2px solid var(--vscode-editor-background);
		`;

		// Commit header
		const header = DOM.append(item, DOM.$('div.commit-header'));
		header.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';
		header.addEventListener('click', () => this.toggleCommitExpand(commit.hash));

		// Hash
		const hash = DOM.append(header, DOM.$('code.commit-hash'));
		hash.textContent = commit.short_hash;
		hash.style.cssText = `
			font-family: var(--vscode-editor-font-family);
			font-size: 11px;
			padding: 2px 6px;
			background: var(--vscode-textCodeBlock-background);
			border-radius: 3px;
			color: var(--vscode-textLink-foreground);
		`;

		// Message (truncated)
		const message = DOM.append(header, DOM.$('span.commit-message'));
		const firstLine = commit.message.split('\n')[0];
		message.textContent = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
		message.style.cssText = 'font-size: 12px; color: var(--vscode-foreground); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

		// Timestamp
		const time = DOM.append(header, DOM.$('span.commit-time'));
		time.textContent = this.formatTimestamp(commit.timestamp);
		time.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground);';

		// Expanded details
		if (this.expandedCommits.has(commit.hash)) {
			const details = DOM.append(item, DOM.$('div.commit-details'));
			details.style.cssText = 'margin-top: 8px; padding-left: 8px; font-size: 11px;';

			// Full message
			if (commit.message.includes('\n') || firstLine.length > 50) {
				const fullMessage = DOM.append(details, DOM.$('div.full-message'));
				fullMessage.textContent = commit.message;
				fullMessage.style.cssText = 'color: var(--vscode-foreground); white-space: pre-wrap; margin-bottom: 8px;';
			}

			// Files changed
			if (commit.files_changed && commit.files_changed.length > 0) {
				const filesHeader = DOM.append(details, DOM.$('div.files-header'));
				filesHeader.textContent = `${commit.files_changed.length} file${commit.files_changed.length !== 1 ? 's' : ''} changed:`;
				filesHeader.style.cssText = 'color: var(--vscode-descriptionForeground); margin-bottom: 4px;';

				const filesList = DOM.append(details, DOM.$('ul.files-list'));
				filesList.style.cssText = 'margin: 0; padding-left: 16px; color: var(--vscode-foreground);';

				for (const file of commit.files_changed.slice(0, 5)) {
					const fileItem = DOM.append(filesList, DOM.$('li'));
					fileItem.textContent = file;
				}

				if (commit.files_changed.length > 5) {
					const moreFiles = DOM.append(filesList, DOM.$('li'));
					moreFiles.textContent = `+ ${commit.files_changed.length - 5} more`;
					moreFiles.style.color = 'var(--vscode-descriptionForeground)';
				}
			}
		}
	}

	private toggleCommitExpand(hash: string): void {
		if (this.expandedCommits.has(hash)) {
			this.expandedCommits.delete(hash);
		} else {
			this.expandedCommits.add(hash);
		}
		this.render();
	}

	private formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) {
			return 'just now';
		} else if (diffMins < 60) {
			return `${diffMins}m ago`;
		} else if (diffHours < 24) {
			return `${diffHours}h ago`;
		} else if (diffDays < 7) {
			return `${diffDays}d ago`;
		} else {
			return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		}
	}

	private getCommitIcon(): string {
		return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="8" cy="8" r="3" stroke="var(--vscode-charts-green)" stroke-width="2" fill="none"/>
			<line x1="0" y1="8" x2="5" y2="8" stroke="var(--vscode-charts-green)" stroke-width="2"/>
			<line x1="11" y1="8" x2="16" y2="8" stroke="var(--vscode-charts-green)" stroke-width="2"/>
		</svg>`;
	}

	private getCalendarIcon(): string {
		return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect x="1" y="3" width="14" height="12" rx="1" stroke="var(--vscode-descriptionForeground)" stroke-width="1.5" fill="none"/>
			<line x1="1" y1="7" x2="15" y2="7" stroke="var(--vscode-descriptionForeground)" stroke-width="1.5"/>
			<line x1="4" y1="1" x2="4" y2="4" stroke="var(--vscode-descriptionForeground)" stroke-width="1.5"/>
			<line x1="12" y1="1" x2="12" y2="4" stroke="var(--vscode-descriptionForeground)" stroke-width="1.5"/>
		</svg>`;
	}

	update(data: unknown): void {
		this.data = data as CommitTimelineData;
		// Sort commits by timestamp descending (most recent first)
		if (this.data?.commits) {
			this.data.commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
		}
		this.render();
	}

	override dispose(): void {
		this.expandedCommits.clear();
		super.dispose();
	}
}
