/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseLanguageAnalyzer } from './index.js';

/**
 * Go complexity analyzer
 */
export class GoAnalyzer extends BaseLanguageAnalyzer {
	language = 'go';

	// Match func declarations, including methods with receivers
	functionPattern = /func\s+(?:\([^)]*\)\s*)?(\w+)\s*\([^)]*\)/;

	decisionKeywords = [
		'if', 'else', 'for', 'switch', 'case', 'select',
		'default', 'range'
	];

	featureFlagPatterns = [
		/\bfeatureFlag\b/i,
		/\bisFeatureEnabled\b/i,
		/\bFF_\w+/,
		/\bFEATURE_\w+/,
		/\bos\.Getenv\b/,
		/\bconfig\.\w+\.Enabled\b/i,
		/\bflags?\.\w+/i
	];

	protected extractFunctionName(match: string): string {
		// Handle method receivers: func (r *Receiver) MethodName(...)
		const methodMatch = match.match(/func\s+\([^)]*\)\s*(\w+)/);
		if (methodMatch) return methodMatch[1];

		// Regular function: func FuncName(...)
		const funcMatch = match.match(/func\s+(\w+)/);
		return funcMatch ? funcMatch[1] : 'anonymous';
	}

	protected extractParameters(match: string): string[] {
		// Extract the last set of parentheses (parameters, not receiver)
		const allParams = match.match(/\(([^)]*)\)/g);
		if (!allParams || allParams.length === 0) return [];

		const paramsStr = allParams[allParams.length - 1].slice(1, -1);
		if (!paramsStr.trim()) return [];

		return paramsStr
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0)
			.map(p => {
				// Go parameters: name type or name, name type
				const nameMatch = p.match(/^(\w+)/);
				return nameMatch ? nameMatch[1] : p;
			});
	}
}
