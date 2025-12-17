/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Detects functions with too many parameters
 * Warning: > 5 params, Critical: > 8 params
 */
export class TooManyParamsRule implements RedFlagRule {
	id = 'too-many-params';
	name = 'Too Many Parameters';
	category = 'parameters' as const;
	description = 'Detects functions with excessive parameter count';

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];

		// Match function declarations with parameters
		const patterns = this.getFunctionPatterns(language);

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(source)) !== null) {
				const fullMatch = match[0];
				const paramsMatch = fullMatch.match(/\(([^)]*)\)/);

				if (paramsMatch && paramsMatch[1]) {
					const params = this.countParameters(paramsMatch[1], language);
					const functionName = this.extractFunctionName(fullMatch, language);
					const line = source.substring(0, match.index).split('\n').length - 1;

					if (params > 8) {
						flags.push({
							id: `${this.id}-${line}`,
							category: this.category,
							severity: 'critical',
							message: `Function '${functionName}' has ${params} parameters (critical: > 8)`,
							file: filePath,
							line,
							column: 0,
							functionName,
							suggestion: 'Use a configuration object or builder pattern instead'
						});
					} else if (params > 5) {
						flags.push({
							id: `${this.id}-${line}`,
							category: this.category,
							severity: 'warning',
							message: `Function '${functionName}' has ${params} parameters (warning: > 5)`,
							file: filePath,
							line,
							column: 0,
							functionName,
							suggestion: 'Consider grouping related parameters into an object'
						});
					}
				}
			}
		}

		return flags;
	}

	private getFunctionPatterns(language: string): RegExp[] {
		switch (language) {
			case 'python':
				return [/(?:async\s+)?def\s+\w+\s*\([^)]*\)/g];
			case 'rust':
				return [/(?:pub\s+)?(?:async\s+)?fn\s+\w+\s*(?:<[^>]*>)?\s*\([^)]*\)/g];
			case 'go':
				return [/func\s+(?:\([^)]*\)\s*)?\w+\s*\([^)]*\)/g];
			default:
				return [/(?:function\s+\w+|(?:\w+\s+)*\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g];
		}
	}

	private countParameters(paramsString: string, language: string): number {
		if (!paramsString.trim()) return 0;

		// Split by comma, but handle nested generics and functions
		let depth = 0;
		let params = 0;
		let hasContent = false;

		for (let i = 0; i < paramsString.length; i++) {
			const char = paramsString[i];
			if (char === '<' || char === '(' || char === '[' || char === '{') {
				depth++;
			} else if (char === '>' || char === ')' || char === ']' || char === '}') {
				depth--;
			} else if (char === ',' && depth === 0) {
				params++;
			} else if (char.trim() !== '') {
				hasContent = true;
			}
		}

		if (hasContent) params++;

		// Filter out 'self', 'cls' for Python, 'this' for others
		const selfParams = language === 'python'
			? (paramsString.match(/\bself\b|\bcls\b/g) || []).length
			: 0;

		return Math.max(0, params - selfParams);
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
		const m = match.match(/(?:function\s+)?(\w+)\s*\(/);
		return m ? m[1] : 'anonymous';
	}
}
