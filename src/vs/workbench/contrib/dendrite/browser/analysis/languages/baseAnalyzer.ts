/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SyntaxTree, SyntaxNode } from '../treeSitterBridge.js';
import { FunctionMetrics, calculateCyclomaticComplexity, calculateCognitiveComplexity } from '../metrics.js';

/**
 * Extracted function info from AST
 */
export interface ExtractedFunction {
	name: string;
	body: string;
	startLine: number;
	endLine: number;
	startColumn: number;
	endColumn: number;
	parameters: string[];
	node?: SyntaxNode;
}

/**
 * Language-specific analyzer interface
 */
export interface LanguageAnalyzer {
	language: string;
	extractFunctions(tree: SyntaxTree, source: string): ExtractedFunction[];
	calculateMetrics(fn: ExtractedFunction, source: string): FunctionMetrics;
}

/**
 * Base analyzer with common logic
 */
export abstract class BaseLanguageAnalyzer implements LanguageAnalyzer {
	abstract language: string;
	abstract functionPattern: RegExp;
	abstract decisionKeywords: string[];
	abstract featureFlagPatterns: RegExp[];

	extractFunctions(tree: SyntaxTree, source: string): ExtractedFunction[] {
		const functions: ExtractedFunction[] = [];
		const lines = source.split('\n');

		// Use regex to find function definitions
		let match;
		const pattern = new RegExp(this.functionPattern, 'gm');

		while ((match = pattern.exec(source)) !== null) {
			const startIndex = match.index;
			const startLine = source.substring(0, startIndex).split('\n').length - 1;

			// Find function body by counting braces
			const bodyStart = source.indexOf('{', startIndex);
			if (bodyStart === -1) { continue; }

			const endIndex = this.findMatchingBrace(source, bodyStart);
			if (endIndex === -1) { continue; }

			const endLine = source.substring(0, endIndex).split('\n').length - 1;
			const body = source.substring(bodyStart, endIndex + 1);

			// Extract function name and parameters
			const fnName = this.extractFunctionName(match[0]);
			const params = this.extractParameters(match[0]);

			if (fnName) {
				functions.push({
					name: fnName,
					body,
					startLine,
					endLine,
					startColumn: 0,
					endColumn: lines[endLine] ? lines[endLine].length : 0,
					parameters: params
				});
			}
		}

		return functions;
	}

	calculateMetrics(fn: ExtractedFunction, source: string): FunctionMetrics {
		const bodyLines = fn.body.split('\n');
		const nonEmptyLines = bodyLines.filter(l => l.trim().length > 0);

		// Count decision points
		let decisionPointCount = 0;
		for (const keyword of this.decisionKeywords) {
			const regex = new RegExp(`\\b${keyword}\\b`, 'g');
			const matches = fn.body.match(regex);
			if (matches) {
				decisionPointCount += matches.length;
			}
		}

		const maxNestingDepth = this.calculateMaxNestingDepth(fn.body);
		
		const cyclomaticComplexity = calculateCyclomaticComplexity(decisionPointCount);
		const cognitiveComplexity = calculateCognitiveComplexity(decisionPointCount, maxNestingDepth, 0);

		// Count feature flags
		let hasFeatureFlags = false;
		for (const pattern of this.featureFlagPatterns) {
			const matches = fn.body.match(new RegExp(pattern, 'g'));
			if (matches && matches.length > 0) {
				hasFeatureFlags = true;
				break;
			}
		}

		return {
			name: fn.name,
			lines: nonEmptyLines.length,
			cyclomaticComplexity,
			cognitiveComplexity,
			parameters: fn.parameters.length,
			maxNestingDepth,
			hasFeatureFlags,
			startLine: fn.startLine,
			endLine: fn.endLine,
			range: {
				startLine: fn.startLine,
				startColumn: fn.startColumn,
				endLine: fn.endLine,
				endColumn: fn.endColumn
			}
		};
	}

	private findMatchingBrace(source: string, openIndex: number): number {
		let depth = 1;
		for (let i = openIndex + 1; i < source.length; i++) {
			if (source[i] === '{') {
				depth++;
			} else if (source[i] === '}') {
				depth--;
				if (depth === 0) {
					return i;
				}
			}
		}
		return -1;
	}

	private calculateMaxNestingDepth(body: string): number {
		let depth = 0;
		let maxDepth = 0;

		for (const char of body) {
			if (char === '{') {
				depth++;
				maxDepth = Math.max(maxDepth, depth);
			} else if (char === '}') {
				depth--;
			}
		}

		return maxDepth;
	}

	protected extractFunctionName(match: string): string {
		const nameMatch = match.match(/function\s+(\w+)|(\w+)\s*\(|(\w+)\s*=/);
		return nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3]) : '';
	}

	protected abstract extractParameters(match: string): string[];
}
