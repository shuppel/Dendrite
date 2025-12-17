/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { IViewletViewOptions } from '../../../../browser/parts/views/viewsViewlet.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { getRedFlagService } from './redFlagService.js';
import { RedFlag, RedFlagSeverity } from './redFlagTypes.js';

/**
 * Panel view showing all red flags in the current project
 */
export class RedFlagPanel extends ViewPane {
	static readonly ID = 'dendrite.redFlagsPanel';

	private container: HTMLElement | undefined;
	private listContainer: HTMLElement | undefined;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.container = container;
		this.container.classList.add('dendrite-red-flag-panel');

		// Create header with summary
		const header = DOM.append(container, DOM.$('.red-flag-header'));
		this.renderSummary(header);

		// Create scrollable list container
		this.listContainer = DOM.append(container, DOM.$('.red-flag-list'));
		this.renderFlagList();

		// Subscribe to updates
		const redFlagService = getRedFlagService();
		this._register(redFlagService.onDidUpdateFlags(() => {
			this.refresh();
		}));
	}

	private renderSummary(container: HTMLElement): void {
		DOM.clearNode(container);

		const redFlagService = getRedFlagService();
		const summary = redFlagService.getProjectSummary();

		const summaryHtml = DOM.append(container, DOM.$('.summary-stats'));

		// Critical count
		const critical = DOM.append(summaryHtml, DOM.$('.stat.critical'));
		critical.innerHTML = `<span class="icon">&#x1F534;</span> <span class="count">${summary.criticalFiles}</span> critical`;

		// Warning count
		const warning = DOM.append(summaryHtml, DOM.$('.stat.warning'));
		warning.innerHTML = `<span class="icon">&#x1F7E0;</span> <span class="count">${summary.warningFiles}</span> warnings`;

		// Healthy count
		const healthy = DOM.append(summaryHtml, DOM.$('.stat.healthy'));
		healthy.innerHTML = `<span class="icon">&#x1F7E2;</span> <span class="count">${summary.healthyFiles}</span> healthy`;
	}

	private renderFlagList(): void {
		if (!this.listContainer) return;
		DOM.clearNode(this.listContainer);

		const redFlagService = getRedFlagService();
		const summary = redFlagService.getProjectSummary();

		// Group by file
		for (const fileSummary of summary.files) {
			if (fileSummary.flags.length === 0) continue;

			// File header
			const fileHeader = DOM.append(this.listContainer, DOM.$('.file-header'));
			const fileName = this.extractFileName(fileSummary.file);
			fileHeader.innerHTML = `
				<span class="file-name">${fileName}</span>
				<span class="flag-count">(${fileSummary.flags.length})</span>
			`;

			// Flags for this file
			for (const flag of fileSummary.flags) {
				const flagItem = this.createFlagItem(flag);
				this.listContainer.appendChild(flagItem);
			}
		}

		// Empty state
		if (summary.files.every(f => f.flags.length === 0)) {
			const empty = DOM.append(this.listContainer, DOM.$('.empty-state'));
			empty.textContent = 'No red flags detected. Your code looks healthy!';
		}
	}

	private createFlagItem(flag: RedFlag): HTMLElement {
		const item = DOM.$('.flag-item');
		item.classList.add(`severity-${flag.severity}`);

		const icon = this.getSeverityIcon(flag.severity);
		const line = flag.line + 1; // Display as 1-based

		item.innerHTML = `
			<div class="flag-header">
				<span class="severity-icon">${icon}</span>
				<span class="flag-category">[${flag.category}]</span>
				<span class="flag-location">Line ${line}</span>
			</div>
			<div class="flag-message">${this.escapeHtml(flag.message)}</div>
			${flag.suggestion ? `<div class="flag-suggestion">${this.escapeHtml(flag.suggestion)}</div>` : ''}
		`;

		// Click to navigate to the line
		item.addEventListener('click', () => {
			this.navigateToFlag(flag);
		});

		return item;
	}

	private getSeverityIcon(severity: RedFlagSeverity): string {
		switch (severity) {
			case 'critical':
				return '&#x1F534;'; // Red circle
			case 'warning':
				return '&#x1F7E0;'; // Orange circle
			case 'info':
			default:
				return '&#x1F535;'; // Blue circle
		}
	}

	private extractFileName(uri: string): string {
		const parts = uri.split('/');
		return parts[parts.length - 1];
	}

	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	private navigateToFlag(flag: RedFlag): void {
		// This would use the editor service to navigate
		// For now, just log
		console.log(`Navigate to ${flag.file}:${flag.line + 1}`);
		// TODO: Implement actual navigation using IEditorService
	}

	private refresh(): void {
		if (this.container) {
			const header = this.container.querySelector('.red-flag-header');
			if (header) {
				this.renderSummary(header as HTMLElement);
			}
			this.renderFlagList();
		}
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}
}

/**
 * CSS for red flag panel - to be injected
 */
export const redFlagPanelStyles = `
.dendrite-red-flag-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 8px;
}

.dendrite-red-flag-panel .red-flag-header {
	padding: 8px;
	border-bottom: 1px solid var(--vscode-panel-border);
}

.dendrite-red-flag-panel .summary-stats {
	display: flex;
	gap: 16px;
}

.dendrite-red-flag-panel .stat {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
}

.dendrite-red-flag-panel .stat .count {
	font-weight: bold;
}

.dendrite-red-flag-panel .red-flag-list {
	flex: 1;
	overflow-y: auto;
	padding: 8px 0;
}

.dendrite-red-flag-panel .file-header {
	padding: 8px;
	font-weight: bold;
	background: var(--vscode-list-hoverBackground);
	margin-top: 8px;
}

.dendrite-red-flag-panel .file-header:first-child {
	margin-top: 0;
}

.dendrite-red-flag-panel .file-name {
	color: var(--vscode-textLink-foreground);
}

.dendrite-red-flag-panel .flag-count {
	color: var(--vscode-descriptionForeground);
	margin-left: 8px;
}

.dendrite-red-flag-panel .flag-item {
	padding: 8px;
	border-left: 3px solid transparent;
	cursor: pointer;
}

.dendrite-red-flag-panel .flag-item:hover {
	background: var(--vscode-list-hoverBackground);
}

.dendrite-red-flag-panel .flag-item.severity-critical {
	border-left-color: #ff0000;
}

.dendrite-red-flag-panel .flag-item.severity-warning {
	border-left-color: #ffa500;
}

.dendrite-red-flag-panel .flag-item.severity-info {
	border-left-color: #0096ff;
}

.dendrite-red-flag-panel .flag-header {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-bottom: 4px;
}

.dendrite-red-flag-panel .flag-category {
	color: var(--vscode-descriptionForeground);
	font-size: 11px;
}

.dendrite-red-flag-panel .flag-location {
	color: var(--vscode-descriptionForeground);
	font-size: 11px;
}

.dendrite-red-flag-panel .flag-message {
	font-size: 13px;
}

.dendrite-red-flag-panel .flag-suggestion {
	font-size: 11px;
	color: var(--vscode-descriptionForeground);
	font-style: italic;
	margin-top: 4px;
}

.dendrite-red-flag-panel .empty-state {
	padding: 24px;
	text-align: center;
	color: var(--vscode-descriptionForeground);
}
`;
