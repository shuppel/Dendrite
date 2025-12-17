/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { BaseLanguageAnalyzer, ExtractedFunction } from './baseAnalyzer.js';
import { SyntaxTree } from '../treeSitterBridge.js';
import { FunctionMetrics, calculateCyclomaticComplexity, calculateCognitiveComplexity, CodeMetrics } from '../metrics.js';

/**
 * Python complexity analyzer
 * Python uses indentation instead of braces, so we need special handling
 */
export class PythonAnalyzer extends BaseLanguageAnalyzer {
	language = 'python';

	functionPattern = /^(\s*)(?:async\s+)?def\s+(\w+)\s*\([^)]*\)/gm;

	decisionKeywords = [
		'if', 'elif', 'else', 'for', 'while',
		'try', 'except', 'finally', 'with',
		'match', 'case'  // Python 3.10+
	];

	featureFlagPatterns = [
		/\bfeature_flag\b/i,
		/\bis_feature_enabled\b/i,
		/\bFF_\w+/,
		/\bFEATURE_\w+/,
		/\bos\.environ\.\w+/,
		/\bconfig\.\w+\.enabled\b/i,
		/\bflags?\.\w+/i,
		/\bsettings\.\w+/i
	];

	override extractFunctions(tree: SyntaxTree, source: string): ExtractedFunction[] {
		const functions: ExtractedFunction[] = [];
		const lines = source.split('\n');

		let match;
		const pattern = new RegExp(this.functionPattern.source, 'gm');

		while ((match = pattern.exec(source)) !== null) {
			const indent = match[1].length;
			const name = match[2];
			const startLine = source.substring(0, match.index).split('\n').length - 1;

			// Find function body by tracking indentation
			let endLine = startLine;
			for (let i = startLine + 1; i < lines.length; i++) {
				const line = lines[i];
				// Skip empty lines and comments
				if (line.trim() === '' || line.trim().startsWith('#')) {
					endLine = i;
					continue;
				}
				// Check if we're still inside the function (more indented than def)
				const lineIndent = line.match(/^(\s*)/)?.[1].length || 0;
				if (lineIndent <= indent && line.trim() !== '') {
					break;
				}
				endLine = i;
			}

			const bodyLines = lines.slice(startLine, endLine + 1);
			const body = bodyLines.join('\n');

			// Extract parameters
			const params = this.extractParameters(match[0]);

			functions.push({
				name,
				body,
				startLine,
				endLine,
				startColumn: indent,
				endColumn: lines[endLine]?.length || 0,
				parameters: params
			});
		}

		return functions;
	}

	override calculateMetrics(fn: ExtractedFunction, source: string): FunctionMetrics {
		const body = fn.body;

		// Count decision points
		let decisionPoints = 0;
		for (const keyword of this.decisionKeywords) {
			const regex = new RegExp(`\\b${keyword}\\b`, 'g');
			const matches = body.match(regex);
			decisionPoints += matches ? matches.length : 0;
		}

		// Count logical operators (Python uses 'and', 'or')
		const andOr = (body.match(/\b(and|or)\b/g) || []).length;
		decisionPoints += andOr;

		// Count comprehensions (list, dict, set, generator)
		const comprehensions = (body.match(/\bfor\b.*\bin\b/g) || []).length;
		decisionPoints += comprehensions;

		// Calculate nesting by indentation
		const maxNesting = this.calculatePythonNesting(body);

		// Count sequence breaks
		const sequenceBreaks = (body.match(/\b(return|raise|break|continue)\b/g) || []).length;

		// Check for feature flags
		const hasFeatureFlags = this.featureFlagPatterns.some(pattern => new RegExp(pattern).test(body));

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

	private calculatePythonNesting(body: string): number {
		const lines = body.split('\n');
		const baseIndent = lines[0]?.match(/^(\s*)/)?.[1].length || 0;
		let maxDepth = 0;

		for (const line of lines) {
			if (line.trim() === '' || line.trim().startsWith('#')) continue;
			const indent = line.match(/^(\s*)/)?.[1].length || 0;
			const depth = Math.floor((indent - baseIndent) / 4); // Assuming 4-space indent
			maxDepth = Math.max(maxDepth, depth);
		}

		return maxDepth;
	}

	protected override extractFunctionName(match: string): string {
		const nameMatch = match.match(/def\s+(\w+)/);
		return nameMatch ? nameMatch[1] : 'anonymous';
	}

	protected override extractParameters(match: string): string[] {
		const paramsMatch = match.match(/\(([^)]*)\)/);
		if (!paramsMatch || !paramsMatch[1].trim()) return [];

		return paramsMatch[1]
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0 && p !== 'self' && p !== 'cls')
			.map(p => {
				// Extract just the parameter name, not type hints or defaults
				const nameMatch = p.match(/^(\w+)/);
				return nameMatch ? nameMatch[1] : p;
			});
	}
}
