/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SyntaxTree, SyntaxNode } from '../treeSitterBridge.js';
import { FunctionMetrics, CodeMetrics, calculateCyclomaticComplexity, calculateCognitiveComplexity } from '../metrics.js';

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
			if (bodyStart === -1) continue;

			const endIndex = this.findMatchingBrace(source, bodyStart);
			if (endIndex === -1) continue;

			const endLine = source.substring(0, endIndex).split('\n').length - 1;
			const body = source.substring(bodyStart, endIndex + 1);

			// Extract function name
			const name = this.extractFunctionName(match[0]);

			// Extract parameters
			const params = this.extractParameters(match[0]);

			functions.push({
				name,
				body,
				startLine,
				endLine,
				startColumn: 0,
				endColumn: lines[endLine]?.length || 0,
				parameters: params
			});
		}

		return functions;
	}

	calculateMetrics(fn: ExtractedFunction, source: string): FunctionMetrics {
		const body = fn.body;

		// Count decision points for cyclomatic complexity
		let decisionPoints = 0;
		for (const keyword of this.decisionKeywords) {
			const regex = new RegExp(`\\b${keyword}\\b`, 'g');
			const matches = body.match(regex);
			decisionPoints += matches ? matches.length : 0;
		}

		// Count logical operators
		const andOr = (body.match(/&&|\|\|/g) || []).length;
		decisionPoints += andOr;

		// Count ternary operators
		const ternary = (body.match(/\?[^:]*:/g) || []).length;
		decisionPoints += ternary;

		// Calculate nesting depth
		const maxNesting = this.calculateMaxNesting(body);

		// Count sequence breaks (returns, throws, breaks, continues)
		const sequenceBreaks = (body.match(/\b(return|throw|break|continue)\b/g) || []).length;

		// Check for feature flags
		const hasFeatureFlags = this.checkFeatureFlags(body);

		const metrics: CodeMetrics = {
			cyclomaticComplexity: calculateCyclomaticComplexity(decisionPoints),
			cognitiveComplexity: calculateCognitiveComplexity(decisionPoints, maxNesting, sequenceBreaks),
			lines: fn.endLine - fn.startLine + 1,
			parameters: fn.parameters.length,
			maxNestingDepth: maxNesting,
			hasFeatureFlags
		};

		return {
			...metrics,
			name: fn.name,
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

	protected findMatchingBrace(source: string, start: number): number {
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

	protected calculateMaxNesting(body: string): number {
		let maxDepth = 0;
		let currentDepth = 0;

		for (const char of body) {
			if (char === '{') {
				currentDepth++;
				maxDepth = Math.max(maxDepth, currentDepth);
			} else if (char === '}') {
				currentDepth--;
			}
		}

		return maxDepth;
	}

	protected checkFeatureFlags(body: string): boolean {
		for (const pattern of this.featureFlagPatterns) {
			if (pattern.test(body)) {
				return true;
			}
		}
		return false;
	}

	protected abstract extractFunctionName(match: string): string;
	protected abstract extractParameters(match: string): string[];
}

// Import language-specific analyzers
import { TypeScriptAnalyzer } from './typescript.js';
import { PythonAnalyzer } from './python.js';
import { RustAnalyzer } from './rust.js';
import { GoAnalyzer } from './go.js';
import { JavaAnalyzer } from './java.js';
import { CSharpAnalyzer } from './csharp.js';
import { CppAnalyzer } from './cpp.js';

const analyzers: Map<string, LanguageAnalyzer> = new Map();

// Register analyzers
function registerAnalyzer(analyzer: LanguageAnalyzer) {
	analyzers.set(analyzer.language, analyzer);
}

registerAnalyzer(new TypeScriptAnalyzer());
registerAnalyzer(new PythonAnalyzer());
registerAnalyzer(new RustAnalyzer());
registerAnalyzer(new GoAnalyzer());
registerAnalyzer(new JavaAnalyzer());
registerAnalyzer(new CSharpAnalyzer());
registerAnalyzer(new CppAnalyzer());

// JavaScript uses TypeScript analyzer
analyzers.set('javascript', analyzers.get('typescript')!);

/**
 * Get analyzer for a language
 */
export function getLanguageAnalyzer(language: string): LanguageAnalyzer | undefined {
	return analyzers.get(language);
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
	return analyzers.has(language);
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): string[] {
	return Array.from(analyzers.keys());
}
