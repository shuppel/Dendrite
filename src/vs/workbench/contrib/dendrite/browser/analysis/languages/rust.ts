/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { BaseLanguageAnalyzer } from './baseAnalyzer.js';

/**
 * Rust complexity analyzer
 */
export class RustAnalyzer extends BaseLanguageAnalyzer {
	language = 'rust';

	// Match fn declarations, including impl methods and async functions
	functionPattern = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)/;

	decisionKeywords = [
		'if', 'else', 'match', 'for', 'while', 'loop',
		'if let', 'while let'
	];

	featureFlagPatterns = [
		/\#\[cfg\(/,  // Rust conditional compilation
		/\bfeature_flag\b/i,
		/\bis_feature_enabled\b/i,
		/\bFF_\w+/,
		/\bFEATURE_\w+/,
		/\bstd::env::var\b/,
		/\bconfig\.\w+\.enabled\b/i
	];

	protected override extractFunctionName(match: string): string {
		const nameMatch = match.match(/fn\s+(\w+)/);
		return nameMatch ? nameMatch[1] : 'anonymous';
	}

	protected override extractParameters(match: string): string[] {
		const paramsMatch = match.match(/\(([^)]*)\)/);
		if (!paramsMatch || !paramsMatch[1].trim()) return [];

		return paramsMatch[1]
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0 && !p.startsWith('&self') && !p.startsWith('self') && !p.startsWith('&mut self'))
			.map(p => {
				// Extract parameter name before colon (type annotation)
				const nameMatch = p.match(/^(?:mut\s+)?(\w+)/);
				return nameMatch ? nameMatch[1] : p;
			});
	}
}
