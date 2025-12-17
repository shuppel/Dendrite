/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Detects magic numbers (unexplained numeric literals)
 * Excludes: 0, 1, -1, 2, common values, array indices, loop counters
 */
export class MagicNumbersRule implements RedFlagRule {
	id = 'magic-numbers';
	name = 'Magic Numbers';
	category = 'magic-number' as const;
	description = 'Detects unexplained numeric literals in code';

	// Common acceptable values
	private readonly allowedNumbers = new Set([
		'0', '1', '-1', '2', '10', '100', '1000',
		'0.0', '1.0', '0.5',
		'24', '60', '1000', '3600', '86400', // Time constants
		'256', '512', '1024', '2048', '4096', // Powers of 2
		'0x00', '0xff', '0xFF'
	]);

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];
		const lines = source.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Skip comments
			if (this.isComment(line, language)) continue;

			// Skip const/final declarations (they're defining the constant)
			if (this.isConstDeclaration(line, language)) continue;

			// Skip array index access with small numbers
			if (line.match(/\[\s*[0-2]\s*\]/)) continue;

			// Find numeric literals
			const numberPattern = /(?<![.\w])(-?\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+)(?![.\w])/g;
			let match;

			while ((match = numberPattern.exec(line)) !== null) {
				const number = match[1];

				// Skip allowed numbers
				if (this.allowedNumbers.has(number)) continue;

				// Skip if it's in a string
				if (this.isInString(line, match.index)) continue;

				// Skip loop bounds like i < 10
				if (this.isLoopBound(line, match.index)) continue;

				// Skip array sizes in declarations
				if (this.isArraySize(line, match.index)) continue;

				flags.push({
					id: `${this.id}-${i}-${match.index}`,
					category: this.category,
					severity: 'info',
					message: `Magic number: ${number}`,
					file: filePath,
					line: i,
					column: match.index,
					suggestion: 'Extract this number into a named constant'
				});
			}
		}

		return flags;
	}

	private isComment(line: string, language: string): boolean {
		const trimmed = line.trim();
		if (language === 'python') {
			return trimmed.startsWith('#');
		}
		return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
	}

	private isConstDeclaration(line: string, language: string): boolean {
		if (language === 'python') {
			// Python uppercase convention for constants
			return /^[A-Z_]+\s*=/.test(line.trim());
		}
		if (language === 'rust') {
			return /\b(const|static)\b/.test(line);
		}
		if (language === 'go') {
			return /\bconst\b/.test(line);
		}
		// JS/TS/Java/C#/C++
		return /\b(const|final|static\s+final|#define|constexpr)\b/.test(line);
	}

	private isInString(line: string, position: number): boolean {
		let inString = false;
		let stringChar = '';

		for (let i = 0; i < position; i++) {
			const char = line[i];
			if ((char === '"' || char === "'" || char === '`') && line[i - 1] !== '\\') {
				if (!inString) {
					inString = true;
					stringChar = char;
				} else if (char === stringChar) {
					inString = false;
				}
			}
		}

		return inString;
	}

	private isLoopBound(line: string, position: number): boolean {
		// Check if number appears after < or <= in a loop context
		const before = line.substring(0, position);
		return /(?:for|while).*[<>]=?\s*$/.test(before);
	}

	private isArraySize(line: string, position: number): boolean {
		const before = line.substring(0, position);
		const after = line.substring(position);
		// Check for array[n] or new Type[n] patterns in declarations
		return /\[\s*$/.test(before) && /^\d+\s*\]/.test(after);
	}
}
