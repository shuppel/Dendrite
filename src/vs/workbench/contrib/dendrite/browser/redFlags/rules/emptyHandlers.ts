/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Detects empty catch/except/error handlers
 */
export class EmptyHandlersRule implements RedFlagRule {
	id = 'empty-handlers';
	name = 'Empty Error Handlers';
	category = 'empty-handler' as const;
	description = 'Detects empty catch blocks and error handlers';

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];

		if (language === 'python') {
			return this.detectPythonExcept(source, filePath);
		}

		// C-style languages: catch blocks
		const catchPattern = /\bcatch\s*\([^)]*\)\s*\{([^}]*)\}/g;
		let match;

		while ((match = catchPattern.exec(source)) !== null) {
			const body = match[1].trim();
			const line = source.substring(0, match.index).split('\n').length - 1;

			if (this.isEmptyOrCommentOnly(body)) {
				flags.push({
					id: `${this.id}-${line}`,
					category: this.category,
					severity: 'warning',
					message: 'Empty catch block - errors are silently swallowed',
					file: filePath,
					line,
					column: 0,
					suggestion: 'Log the error or handle it explicitly'
				});
			}
		}

		// Rust: empty match arms with Result/Option
		if (language === 'rust') {
			const rustPatterns = [
				/Err\s*\(\s*_\s*\)\s*=>\s*\{\s*\}/g,
				/None\s*=>\s*\{\s*\}/g
			];

			for (const pattern of rustPatterns) {
				while ((match = pattern.exec(source)) !== null) {
					const line = source.substring(0, match.index).split('\n').length - 1;
					flags.push({
						id: `${this.id}-rust-${line}`,
						category: this.category,
						severity: 'warning',
						message: 'Empty error/None handler',
						file: filePath,
						line,
						column: 0,
						suggestion: 'Handle the error case explicitly or use ? operator'
					});
				}
			}
		}

		// Go: empty if err != nil blocks
		if (language === 'go') {
			const goErrPattern = /if\s+err\s*!=\s*nil\s*\{([^}]*)\}/g;
			while ((match = goErrPattern.exec(source)) !== null) {
				const body = match[1].trim();
				const line = source.substring(0, match.index).split('\n').length - 1;

				if (this.isEmptyOrCommentOnly(body)) {
					flags.push({
						id: `${this.id}-go-${line}`,
						category: this.category,
						severity: 'warning',
						message: 'Empty error handler - error is ignored',
						file: filePath,
						line,
						column: 0,
						suggestion: 'Return the error or handle it explicitly'
					});
				}
			}
		}

		return flags;
	}

	private detectPythonExcept(source: string, filePath: string): RedFlag[] {
		const flags: RedFlag[] = [];
		const lines = source.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Match except: or except Exception:
			if (/^\s*except(\s+\w+)?(\s+as\s+\w+)?\s*:\s*$/.test(line)) {
				// Check if next non-empty line is just 'pass' or a comment
				let j = i + 1;
				let hasContent = false;

				while (j < lines.length) {
					const nextLine = lines[j].trim();
					if (nextLine === '') {
						j++;
						continue;
					}
					if (nextLine === 'pass' || nextLine.startsWith('#')) {
						break;
					}
					hasContent = true;
					break;
				}

				if (!hasContent) {
					flags.push({
						id: `${this.id}-py-${i}`,
						category: this.category,
						severity: 'warning',
						message: 'Empty except block - errors are silently swallowed',
						file: filePath,
						line: i,
						column: 0,
						suggestion: 'Log the exception or handle it explicitly'
					});
				}
			}

			// Bare except:
			if (/^\s*except\s*:\s*$/.test(line)) {
				flags.push({
					id: `${this.id}-bare-${i}`,
					category: this.category,
					severity: 'critical',
					message: 'Bare except clause catches all exceptions including system exits',
					file: filePath,
					line: i,
					column: 0,
					suggestion: 'Use except Exception: to avoid catching SystemExit, KeyboardInterrupt'
				});
			}
		}

		return flags;
	}

	private isEmptyOrCommentOnly(body: string): boolean {
		const lines = body.split('\n');
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
				return false;
			}
		}
		return true;
	}
}
