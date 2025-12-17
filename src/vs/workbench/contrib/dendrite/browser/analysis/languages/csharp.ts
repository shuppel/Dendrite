/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseLanguageAnalyzer } from './index.js';

/**
 * C# complexity analyzer
 */
export class CSharpAnalyzer extends BaseLanguageAnalyzer {
	language = 'csharp';

	// Match method declarations with C# modifiers
	functionPattern = /(?:(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|partial)\s+)*(?:\w+(?:<[^>]*>)?(?:\[\])?)\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)/;

	decisionKeywords = [
		'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case',
		'catch', 'try', 'finally', 'default', 'when'
	];

	featureFlagPatterns = [
		/\bFeatureFlag\b/i,
		/\bIsFeatureEnabled\b/i,
		/\bFF_\w+/,
		/\bFEATURE_\w+/,
		/\bEnvironment\.GetEnvironmentVariable\b/,
		/\bconfig\.\w+\.Enabled\b/i,
		/\[FeatureGate\(/
	];

	protected extractFunctionName(match: string): string {
		// Find method name by looking for identifier before (
		const nameMatch = match.match(/(\w+)\s*(?:<[^>]*>)?\s*\(/);
		return nameMatch ? nameMatch[1] : 'anonymous';
	}

	protected extractParameters(match: string): string[] {
		const paramsMatch = match.match(/\(([^)]*)\)/);
		if (!paramsMatch || !paramsMatch[1].trim()) return [];

		return paramsMatch[1]
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0)
			.map(p => {
				// C#: [attributes] modifiers Type name = default
				// Get the last word before = or end
				const withoutDefault = p.split('=')[0].trim();
				const parts = withoutDefault.split(/\s+/);
				return parts[parts.length - 1];
			});
	}
}
