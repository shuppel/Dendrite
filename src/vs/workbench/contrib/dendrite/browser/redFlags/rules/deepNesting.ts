/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Detects deeply nested code blocks
 * Warning: > 4 levels, Critical: > 5 levels
 */
export class DeepNestingRule implements RedFlagRule {
	id = 'deep-nesting';
	name = 'Deep Nesting';
	category = 'nesting' as const;
	description = 'Detects code with excessive nesting depth';

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];
		const lines = source.split('\n');

		// Track brace depth for C-style languages
		// For Python, track indentation level
		const isPython = language === 'python';

		if (isPython) {
			return this.detectPythonNesting(lines, filePath);
		}

		let currentDepth = 0;
		let maxDepthLine = 0;
		let maxDepth = 0;
		let depthStartLine = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			for (const char of line) {
				if (char === '{') {
					currentDepth++;
					if (currentDepth > maxDepth) {
						maxDepth = currentDepth;
						maxDepthLine = i;
						if (currentDepth === 5) {
							depthStartLine = i;
						}
					}

					// Flag deep nesting
					if (currentDepth === 5) {
						flags.push({
							id: `${this.id}-${i}`,
							category: this.category,
							severity: 'warning',
							message: `Nesting depth of ${currentDepth} levels`,
							file: filePath,
							line: i,
							column: line.indexOf('{'),
							suggestion: 'Consider extracting nested logic into separate functions'
						});
					} else if (currentDepth > 5) {
						flags.push({
							id: `${this.id}-${i}`,
							category: this.category,
							severity: 'critical',
							message: `Nesting depth of ${currentDepth} levels (critical)`,
							file: filePath,
							line: i,
							column: line.indexOf('{'),
							suggestion: 'Refactor to reduce nesting - use early returns, guard clauses, or extract methods'
						});
					}
				} else if (char === '}') {
					currentDepth = Math.max(0, currentDepth - 1);
				}
			}
		}

		return flags;
	}

	private detectPythonNesting(lines: string[], filePath: string): RedFlag[] {
		const flags: RedFlag[] = [];
		let baseIndent = 0;
		let inFunction = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.trim() === '' || line.trim().startsWith('#')) continue;

			// Detect function start
			if (line.match(/^\s*def\s+/)) {
				baseIndent = (line.match(/^(\s*)/)?.[1].length || 0);
				inFunction = true;
				continue;
			}

			if (inFunction) {
				const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;
				const depth = Math.floor((currentIndent - baseIndent) / 4);

				if (depth >= 4 && depth < 5) {
					flags.push({
						id: `${this.id}-${i}`,
						category: this.category,
						severity: 'warning',
						message: `Nesting depth of ${depth + 1} levels`,
						file: filePath,
						line: i,
						column: currentIndent,
						suggestion: 'Consider extracting nested logic into separate functions'
					});
				} else if (depth >= 5) {
					flags.push({
						id: `${this.id}-${i}`,
						category: this.category,
						severity: 'critical',
						message: `Nesting depth of ${depth + 1} levels (critical)`,
						file: filePath,
						line: i,
						column: currentIndent,
						suggestion: 'Refactor to reduce nesting'
					});
				}
			}
		}

		return flags;
	}
}
