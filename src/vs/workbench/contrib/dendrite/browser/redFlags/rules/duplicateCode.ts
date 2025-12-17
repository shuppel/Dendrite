/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Detects duplicate code blocks using hash-based detection
 * Logs function bodies with identical hashes
 */
export class DuplicateCodeRule implements RedFlagRule {
	id = 'duplicate-code';
	name = 'Duplicate Code';
	category = 'duplicate' as const;
	description = 'Detects duplicated function bodies';

	// Minimum lines for a block to be considered for duplication
	private readonly minLines = 5;

	// Store function hashes across files (for cross-file detection)
	private static functionHashes: Map<string, { file: string; line: number; name: string }[]> = new Map();

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];
		const functions = this.extractFunctions(source, language);

		for (const fn of functions) {
			if (fn.lines < this.minLines) continue;

			// Normalize the function body and create hash
			const normalized = this.normalizeCode(fn.body);
			const hash = this.simpleHash(normalized);

			// Check if we've seen this hash before
			const existing = DuplicateCodeRule.functionHashes.get(hash);

			if (existing) {
				// Check if it's not the same location
				const isDifferentLocation = existing.some(
					e => e.file !== filePath || e.line !== fn.startLine
				);

				if (isDifferentLocation) {
					const duplicateLocations = existing
						.filter(e => e.file !== filePath || e.line !== fn.startLine)
						.map(e => `${e.file}:${e.line + 1} (${e.name})`)
						.join(', ');

					flags.push({
						id: `${this.id}-${fn.startLine}`,
						category: this.category,
						severity: 'warning',
						message: `Function '${fn.name}' has duplicate implementation`,
						file: filePath,
						line: fn.startLine,
						endLine: fn.endLine,
						column: 0,
						functionName: fn.name,
						details: `Duplicates: ${duplicateLocations}`,
						suggestion: 'Extract common logic into a shared function'
					});
				}

				// Add this location to existing
				existing.push({ file: filePath, line: fn.startLine, name: fn.name });
			} else {
				// First time seeing this hash
				DuplicateCodeRule.functionHashes.set(hash, [
					{ file: filePath, line: fn.startLine, name: fn.name }
				]);
			}
		}

		return flags;
	}

	/**
	 * Clear stored hashes (call when starting a new analysis)
	 */
	static clearHashes(): void {
		DuplicateCodeRule.functionHashes.clear();
	}

	private extractFunctions(source: string, language: string): {
		name: string;
		body: string;
		startLine: number;
		endLine: number;
		lines: number;
	}[] {
		const functions: {
			name: string;
			body: string;
			startLine: number;
			endLine: number;
			lines: number;
		}[] = [];

		const patterns = this.getFunctionPatterns(language);

		for (const pattern of patterns) {
			let match;
			const regex = new RegExp(pattern.source, 'gm');

			while ((match = regex.exec(source)) !== null) {
				const startLine = source.substring(0, match.index).split('\n').length - 1;
				const name = this.extractFunctionName(match[0], language);

				// Find function body
				let endLine: number;
				let body: string;

				if (language === 'python') {
					const result = this.extractPythonBody(source.split('\n'), startLine);
					endLine = result.endLine;
					body = result.body;
				} else {
					const braceStart = source.indexOf('{', match.index);
					if (braceStart === -1) continue;

					const braceEnd = this.findMatchingBrace(source, braceStart);
					if (braceEnd === -1) continue;

					endLine = source.substring(0, braceEnd).split('\n').length - 1;
					body = source.substring(braceStart + 1, braceEnd);
				}

				const lines = endLine - startLine + 1;
				functions.push({ name, body, startLine, endLine, lines });
			}
		}

		return functions;
	}

	private getFunctionPatterns(language: string): RegExp[] {
		switch (language) {
			case 'python':
				return [/^\s*(?:async\s+)?def\s+(\w+)\s*\(/gm];
			case 'rust':
				return [/(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/gm];
			case 'go':
				return [/func\s+(?:\([^)]*\)\s*)?(\w+)\s*\(/gm];
			default:
				return [/(?:function\s+\w+|(?:\w+\s+)+\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/gm];
		}
	}

	private extractFunctionName(match: string, language: string): string {
		const patterns: Record<string, RegExp> = {
			python: /def\s+(\w+)/,
			rust: /fn\s+(\w+)/,
			go: /func\s+(?:\([^)]*\)\s*)?(\w+)/
		};
		const pattern = patterns[language] || /(\w+)\s*\(/;
		const m = match.match(pattern);
		return m ? m[1] : 'anonymous';
	}

	private extractPythonBody(lines: string[], startLine: number): { body: string; endLine: number } {
		const baseIndent = lines[startLine].match(/^(\s*)/)?.[1].length || 0;
		let endLine = startLine;
		const bodyLines: string[] = [];

		for (let i = startLine + 1; i < lines.length; i++) {
			const line = lines[i];
			if (line.trim() === '' || line.trim().startsWith('#')) {
				bodyLines.push(line);
				endLine = i;
				continue;
			}
			const indent = line.match(/^(\s*)/)?.[1].length || 0;
			if (indent <= baseIndent) break;
			bodyLines.push(line);
			endLine = i;
		}

		return { body: bodyLines.join('\n'), endLine };
	}

	private findMatchingBrace(source: string, start: number): number {
		let depth = 0;
		for (let i = start; i < source.length; i++) {
			if (source[i] === '{') depth++;
			else if (source[i] === '}') {
				depth--;
				if (depth === 0) return i;
			}
		}
		return -1;
	}

	/**
	 * Normalize code for comparison:
	 * - Remove whitespace
	 * - Remove comments
	 * - Normalize variable names (optional, for more aggressive detection)
	 */
	private normalizeCode(code: string): string {
		return code
			// Remove single-line comments
			.replace(/\/\/.*$/gm, '')
			.replace(/#.*$/gm, '')
			// Remove multi-line comments
			.replace(/\/\*[\s\S]*?\*\//g, '')
			// Remove string literals (replace with placeholder)
			.replace(/"[^"]*"/g, '""')
			.replace(/'[^']*'/g, "''")
			.replace(/`[^`]*`/g, '``')
			// Normalize whitespace
			.replace(/\s+/g, ' ')
			.trim();
	}

	/**
	 * Simple string hash function
	 */
	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(16);
	}
}
