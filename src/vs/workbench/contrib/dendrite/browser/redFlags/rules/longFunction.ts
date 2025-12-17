/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Detects functions that are too long
 * Warning: > 50 lines, Critical: > 100 lines
 */
export class LongFunctionRule implements RedFlagRule {
	id = 'long-function';
	name = 'Long Function';
	category = 'length' as const;
	description = 'Detects functions that exceed recommended line count';

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];
		const lines = source.split('\n');

		const isPython = language === 'python';
		const functionPatterns = this.getFunctionPatterns(language);

		for (const pattern of functionPatterns) {
			let match;
			const regex = new RegExp(pattern.source, 'gm');

			while ((match = regex.exec(source)) !== null) {
				const startLine = source.substring(0, match.index).split('\n').length - 1;
				const functionName = this.extractFunctionName(match[0], language);

				// Find function end
				let endLine: number;
				if (isPython) {
					endLine = this.findPythonFunctionEnd(lines, startLine);
				} else {
					endLine = this.findBraceFunctionEnd(source, match.index);
				}

				const lineCount = endLine - startLine + 1;

				if (lineCount > 100) {
					flags.push({
						id: `${this.id}-${startLine}`,
						category: this.category,
						severity: 'critical',
						message: `Function '${functionName}' is ${lineCount} lines long (critical: > 100)`,
						file: filePath,
						line: startLine,
						endLine: endLine,
						column: 0,
						functionName,
						suggestion: 'Break this function into smaller, focused functions'
					});
				} else if (lineCount > 50) {
					flags.push({
						id: `${this.id}-${startLine}`,
						category: this.category,
						severity: 'warning',
						message: `Function '${functionName}' is ${lineCount} lines long (warning: > 50)`,
						file: filePath,
						line: startLine,
						endLine: endLine,
						column: 0,
						functionName,
						suggestion: 'Consider splitting this function for better readability'
					});
				}
			}
		}

		return flags;
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
				// TypeScript, JavaScript, Java, C#, C++
				return [
					/(?:function\s+(\w+)|(?:public|private|protected|static|async\s+)*(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/gm
				];
		}
	}

	private extractFunctionName(match: string, language: string): string {
		if (language === 'python') {
			const m = match.match(/def\s+(\w+)/);
			return m ? m[1] : 'anonymous';
		}
		if (language === 'rust') {
			const m = match.match(/fn\s+(\w+)/);
			return m ? m[1] : 'anonymous';
		}
		if (language === 'go') {
			const m = match.match(/func\s+(?:\([^)]*\)\s*)?(\w+)/);
			return m ? m[1] : 'anonymous';
		}
		// C-style
		const m = match.match(/(?:function\s+)?(\w+)\s*\(/);
		return m ? m[1] : 'anonymous';
	}

	private findBraceFunctionEnd(source: string, startIndex: number): number {
		const braceStart = source.indexOf('{', startIndex);
		if (braceStart === -1) return source.substring(0, startIndex).split('\n').length - 1;

		let depth = 0;
		for (let i = braceStart; i < source.length; i++) {
			if (source[i] === '{') depth++;
			else if (source[i] === '}') {
				depth--;
				if (depth === 0) {
					return source.substring(0, i).split('\n').length - 1;
				}
			}
		}
		return source.split('\n').length - 1;
	}

	private findPythonFunctionEnd(lines: string[], startLine: number): number {
		const baseIndent = lines[startLine].match(/^(\s*)/)?.[1].length || 0;

		for (let i = startLine + 1; i < lines.length; i++) {
			const line = lines[i];
			if (line.trim() === '' || line.trim().startsWith('#')) continue;

			const indent = line.match(/^(\s*)/)?.[1].length || 0;
			if (indent <= baseIndent && line.trim() !== '') {
				return i - 1;
			}
		}
		return lines.length - 1;
	}
}
