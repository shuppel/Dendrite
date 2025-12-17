/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { RedFlag, RedFlagFileSummary, RedFlagProjectSummary } from './redFlagTypes.js';
import { allRules, DuplicateCodeRule } from './rules/index.js';
import { getComplexityAnalyzer } from '../analysis/complexityAnalyzer.js';
import { determineComplexitySeverity, getComplexityReasons } from '../analysis/metrics.js';

/**
 * Service for detecting and managing red flags in code
 */
export class RedFlagService extends Disposable {
	private _onDidUpdateFlags = this._register(new Emitter<RedFlagFileSummary>());
	readonly onDidUpdateFlags: Event<RedFlagFileSummary> = this._onDidUpdateFlags.event;

	private _fileSummaries: Map<string, RedFlagFileSummary> = new Map();

	constructor() {
		super();
	}

	/**
	 * Analyze a single file for red flags
	 */
	async analyzeFile(model: ITextModel): Promise<RedFlagFileSummary> {
		const uri = model.uri.toString();
		const source = model.getValue();
		const language = model.getLanguageId();

		const flags: RedFlag[] = [];

		// Run all red flag rules
		for (const rule of allRules) {
			try {
				const ruleFlags = rule.detect(source, uri, language);
				flags.push(...ruleFlags);
			} catch (error) {
				console.error(`Error running rule ${rule.id}:`, error);
			}
		}

		// Also run complexity analysis and add flags for high complexity
		try {
			const complexityAnalyzer = getComplexityAnalyzer();
			const fileMetrics = await complexityAnalyzer.analyzeFile(model);

			if (fileMetrics) {
				for (const fn of fileMetrics.functions) {
					const severity = determineComplexitySeverity(fn);
					if (severity !== 'healthy') {
						const reasons = getComplexityReasons(fn);
						flags.push({
							id: `complexity-${fn.startLine}`,
							category: 'complexity',
							severity: severity === 'critical' ? 'critical' : 'warning',
							message: `Function '${fn.name}' has high complexity`,
							file: uri,
							line: fn.startLine,
							endLine: fn.endLine,
							column: 0,
							functionName: fn.name,
							details: reasons.join('; '),
							suggestion: 'Consider refactoring to reduce complexity'
						});
					}
				}
			}
		} catch (error) {
			console.error('Error running complexity analysis:', error);
		}

		// Sort flags by line number
		flags.sort((a, b) => a.line - b.line);

		// Create summary
		const summary: RedFlagFileSummary = {
			file: uri,
			healthyCount: 0,
			warningCount: flags.filter(f => f.severity === 'warning' || f.severity === 'info').length,
			criticalCount: flags.filter(f => f.severity === 'critical').length,
			flags
		};

		this._fileSummaries.set(uri, summary);
		this._onDidUpdateFlags.fire(summary);

		return summary;
	}

	/**
	 * Get summary for a specific file
	 */
	getFileSummary(uri: string): RedFlagFileSummary | undefined {
		return this._fileSummaries.get(uri);
	}

	/**
	 * Get flags for a specific line
	 */
	getFlagsForLine(uri: string, line: number): RedFlag[] {
		const summary = this._fileSummaries.get(uri);
		if (!summary) return [];

		return summary.flags.filter(f =>
			f.line === line || (f.endLine !== undefined && line >= f.line && line <= f.endLine)
		);
	}

	/**
	 * Get project-wide summary
	 */
	getProjectSummary(): RedFlagProjectSummary {
		const files = Array.from(this._fileSummaries.values());

		return {
			totalFiles: files.length,
			healthyFiles: files.filter(f => f.warningCount === 0 && f.criticalCount === 0).length,
			warningFiles: files.filter(f => f.warningCount > 0 && f.criticalCount === 0).length,
			criticalFiles: files.filter(f => f.criticalCount > 0).length,
			files
		};
	}

	/**
	 * Clear analysis for a file
	 */
	clearFile(uri: string): void {
		this._fileSummaries.delete(uri);
	}

	/**
	 * Clear all analysis data
	 */
	clearAll(): void {
		this._fileSummaries.clear();
		DuplicateCodeRule.clearHashes();
	}

	/**
	 * Get all flags of a specific category
	 */
	getFlagsByCategory(category: string): RedFlag[] {
		const allFlags: RedFlag[] = [];
		for (const summary of this._fileSummaries.values()) {
			allFlags.push(...summary.flags.filter(f => f.category === category));
		}
		return allFlags;
	}

	/**
	 * Get all critical flags
	 */
	getCriticalFlags(): RedFlag[] {
		const allFlags: RedFlag[] = [];
		for (const summary of this._fileSummaries.values()) {
			allFlags.push(...summary.flags.filter(f => f.severity === 'critical'));
		}
		return allFlags;
	}
}

// Singleton instance
let redFlagServiceInstance: RedFlagService | null = null;

export function getRedFlagService(): RedFlagService {
	if (!redFlagServiceInstance) {
		redFlagServiceInstance = new RedFlagService();
	}
	return redFlagServiceInstance;
}
