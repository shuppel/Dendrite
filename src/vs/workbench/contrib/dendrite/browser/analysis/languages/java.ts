/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { BaseLanguageAnalyzer } from './baseAnalyzer.js';

/**
 * Java complexity analyzer
 */
export class JavaAnalyzer extends BaseLanguageAnalyzer {
	language = 'java';

	// Match method declarations with various modifiers
	functionPattern = /(?:(?:public|private|protected|static|final|abstract|synchronized|native)\s+)*(?:<[^>]*>\s+)?(?:\w+(?:<[^>]*>)?)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/;

	decisionKeywords = [
		'if', 'else', 'for', 'while', 'do', 'switch', 'case',
		'catch', 'try', 'finally', 'default'
	];

	featureFlagPatterns = [
		/\bfeatureFlag\b/i,
		/\bisFeatureEnabled\b/i,
		/\bFF_\w+/,
		/\bFEATURE_\w+/,
		/\bSystem\.getenv\b/,
		/\bSystem\.getProperty\b/,
		/\bconfig\.\w+\.isEnabled\b/i,
		/\@FeatureToggle\b/
	];

	protected override extractFunctionName(match: string): string {
		// Find method name by looking for identifier before (
		const nameMatch = match.match(/(\w+)\s*\(/);
		return nameMatch ? nameMatch[1] : 'anonymous';
	}

	protected override extractParameters(match: string): string[] {
		const paramsMatch = match.match(/\(([^)]*)\)/);
		if (!paramsMatch || !paramsMatch[1].trim()) return [];

		return paramsMatch[1]
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0)
			.map(p => {
				// Java: Type name or final Type name
				const parts = p.split(/\s+/);
				return parts[parts.length - 1];
			});
	}
}
