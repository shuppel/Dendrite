/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Aggregates TODO, FIXME, HACK, XXX comments
 */
export class TodoAggregatorRule implements RedFlagRule {
	id = 'todo-aggregator';
	name = 'TODO/FIXME Comments';
	category = 'todo' as const;
	description = 'Aggregates TODO, FIXME, HACK, and XXX comments';

	private readonly patterns: { pattern: RegExp; severity: 'info' | 'warning' | 'critical' }[] = [
		{ pattern: /\bTODO\b:?\s*(.*)/i, severity: 'info' },
		{ pattern: /\bFIXME\b:?\s*(.*)/i, severity: 'warning' },
		{ pattern: /\bHACK\b:?\s*(.*)/i, severity: 'warning' },
		{ pattern: /\bXXX\b:?\s*(.*)/i, severity: 'warning' },
		{ pattern: /\bBUG\b:?\s*(.*)/i, severity: 'critical' },
		{ pattern: /\bWARNING\b:?\s*(.*)/i, severity: 'warning' }
	];

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];
		const lines = source.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Only check in comments
			if (!this.isCommentLine(line, language)) continue;

			for (const { pattern, severity } of this.patterns) {
				const match = line.match(pattern);
				if (match) {
					const keyword = match[0].split(/[:\s]/)[0].toUpperCase();
					const message = match[1]?.trim() || '';

					flags.push({
						id: `${this.id}-${i}`,
						category: this.category,
						severity,
						message: `${keyword}: ${message || '(no description)'}`,
						file: filePath,
						line: i,
						column: line.indexOf(keyword),
						details: message
					});
				}
			}
		}

		return flags;
	}

	private isCommentLine(line: string, language: string): boolean {
		const trimmed = line.trim();

		if (language === 'python') {
			return trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''");
		}

		// C-style comments
		return (
			trimmed.startsWith('//') ||
			trimmed.startsWith('/*') ||
			trimmed.startsWith('*') ||
			trimmed.includes('//')
		);
	}
}
