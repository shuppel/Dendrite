/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IModelDecorationOptions, IModelDeltaDecoration, OverviewRulerLane, MinimapPosition } from '../../../../../editor/common/model.js';
import { RedFlag, RedFlagSeverity } from './redFlagTypes.js';
import { getRedFlagService } from './redFlagService.js';

/**
 * Manages gutter decorations for red flags in the editor
 */
export class RedFlagGutterDecorations extends Disposable {
	private decorationIds: string[] = [];
	private editor: ICodeEditor | undefined;

	constructor() {
		super();
	}

	/**
	 * Attach to an editor
	 */
	attach(editor: ICodeEditor): IDisposable {
		this.editor = editor;
		const model = editor.getModel();

		if (model) {
			// Initial decoration
			this.updateDecorations();

			// Listen for model changes
			const disposable = model.onDidChangeContent(() => {
				// Debounce updates
				setTimeout(() => this.updateDecorations(), 500);
			});

			return {
				dispose: () => {
					this.clearDecorations();
					disposable.dispose();
				}
			};
		}

		return { dispose: () => {} };
	}

	/**
	 * Update decorations based on red flags
	 */
	private updateDecorations(): void {
		if (!this.editor) return;

		const model = this.editor.getModel();
		if (!model) return;

		const uri = model.uri.toString();
		const redFlagService = getRedFlagService();
		const summary = redFlagService.getFileSummary(uri);

		if (!summary) {
			this.clearDecorations();
			return;
		}

		const decorations: IModelDeltaDecoration[] = [];

		// Group flags by line
		const flagsByLine = new Map<number, RedFlag[]>();
		for (const flag of summary.flags) {
			const existing = flagsByLine.get(flag.line) || [];
			existing.push(flag);
			flagsByLine.set(flag.line, existing);
		}

		// Create decorations for each line with flags
		for (const [line, flags] of flagsByLine) {
			const severity = this.getHighestSeverity(flags);
			const options = this.getDecorationOptions(severity, flags);

			decorations.push({
				range: {
					startLineNumber: line + 1, // Monaco uses 1-based lines
					startColumn: 1,
					endLineNumber: line + 1,
					endColumn: 1
				},
				options
			});
		}

		// Apply decorations
		this.decorationIds = this.editor.deltaDecorations(
			this.decorationIds,
			decorations
		);
	}

	/**
	 * Get the highest severity from a list of flags
	 */
	private getHighestSeverity(flags: RedFlag[]): RedFlagSeverity {
		if (flags.some(f => f.severity === 'critical')) return 'critical';
		if (flags.some(f => f.severity === 'warning')) return 'warning';
		return 'info';
	}

	/**
	 * Get decoration options based on severity
	 */
	private getDecorationOptions(severity: RedFlagSeverity, flags: RedFlag[]): IModelDecorationOptions {
		const messages = flags.map(f => f.message);
		const hoverMessage = messages.join('\n\n');

		const glyphMarginClassName = this.getGlyphClass(severity);
		const overviewRulerColor = this.getOverviewRulerColor(severity);

		return {
			glyphMarginClassName,
			glyphMarginHoverMessage: { value: hoverMessage },
			overviewRuler: {
				color: overviewRulerColor,
				position: OverviewRulerLane.Right
			},
			minimap: {
				color: overviewRulerColor,
				position: MinimapPosition.Gutter
			},
			isWholeLine: false
		};
	}

	/**
	 * Get CSS class for glyph margin based on severity
	 */
	private getGlyphClass(severity: RedFlagSeverity): string {
		switch (severity) {
			case 'critical':
				return 'dendrite-glyph-critical';
			case 'warning':
				return 'dendrite-glyph-warning';
			case 'info':
			default:
				return 'dendrite-glyph-info';
		}
	}

	/**
	 * Get overview ruler color based on severity
	 */
	private getOverviewRulerColor(severity: RedFlagSeverity): string {
		switch (severity) {
			case 'critical':
				return 'rgba(255, 0, 0, 0.8)';
			case 'warning':
				return 'rgba(255, 165, 0, 0.8)';
			case 'info':
			default:
				return 'rgba(0, 150, 255, 0.5)';
		}
	}

	/**
	 * Clear all decorations
	 */
	private clearDecorations(): void {
		if (this.editor && this.decorationIds.length > 0) {
			this.decorationIds = this.editor.deltaDecorations(this.decorationIds, []);
		}
	}

	override dispose(): void {
		this.clearDecorations();
		super.dispose();
	}
}

/**
 * CSS for gutter decorations - to be injected
 */
export const gutterDecorationStyles = `
.dendrite-glyph-critical {
	background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='%23ff0000'/%3E%3C/svg%3E") center center no-repeat;
	background-size: 12px 12px;
}

.dendrite-glyph-warning {
	background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='%23ffa500'/%3E%3C/svg%3E") center center no-repeat;
	background-size: 12px 12px;
}

.dendrite-glyph-info {
	background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='%230096ff'/%3E%3C/svg%3E") center center no-repeat;
	background-size: 12px 12px;
}
`;
