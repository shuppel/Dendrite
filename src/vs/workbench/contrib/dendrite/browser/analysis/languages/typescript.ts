/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { BaseLanguageAnalyzer } from './index.js';

/**
 * TypeScript/JavaScript complexity analyzer
 */
export class TypeScriptAnalyzer extends BaseLanguageAnalyzer {
	language = 'typescript';

	// Match function declarations, arrow functions, methods
	functionPattern = /(?:(?:async\s+)?function\s+(\w+)|(?:(?:public|private|protected|static|async)\s+)*(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^{]+)?\s*=>)/;

	decisionKeywords = [
		'if', 'else', 'for', 'while', 'do', 'switch', 'case',
		'catch', 'try', 'finally'
	];

	featureFlagPatterns = [
		/\bfeatureFlag\b/i,
		/\bisFeatureEnabled\b/i,
		/\bFF_\w+/,
		/\bFEATURE_\w+/,
		/\bprocess\.env\.\w+/,
		/\bconfig\.\w+\.enabled\b/i,
		/\bflags?\.\w+/i
	];

	protected extractFunctionName(match: string): string {
		// Try to extract function name from different patterns
		const functionMatch = match.match(/function\s+(\w+)/);
		if (functionMatch) return functionMatch[1];

		const methodMatch = match.match(/(?:public|private|protected|static|async\s+)*(\w+)\s*\(/);
		if (methodMatch) return methodMatch[1];

		const arrowMatch = match.match(/(?:const|let|var)\s+(\w+)\s*=/);
		if (arrowMatch) return arrowMatch[1];

		return 'anonymous';
	}

	protected extractParameters(match: string): string[] {
		const paramsMatch = match.match(/\(([^)]*)\)/);
		if (!paramsMatch || !paramsMatch[1].trim()) return [];

		return paramsMatch[1]
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0)
			.map(p => {
				// Extract just the parameter name, not type annotations
				const nameMatch = p.match(/^(\w+)/);
				return nameMatch ? nameMatch[1] : p;
			});
	}
}
