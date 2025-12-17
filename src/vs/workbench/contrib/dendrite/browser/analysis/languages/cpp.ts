/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { BaseLanguageAnalyzer } from './index.js';

/**
 * C/C++ complexity analyzer
 */
export class CppAnalyzer extends BaseLanguageAnalyzer {
	language = 'cpp';

	// Match function/method declarations
	functionPattern = /(?:(?:static|inline|virtual|explicit|constexpr|const|volatile)\s+)*(?:\w+(?:<[^>]*>)?(?:\s*\*+|\s*&+)?)\s+(?:\w+::)?(\w+)\s*\([^)]*\)\s*(?:const|override|noexcept|final)*\s*(?:->[\s\w<>*&]+)?\s*\{/;

	decisionKeywords = [
		'if', 'else', 'for', 'while', 'do', 'switch', 'case',
		'catch', 'try', 'default'
	];

	featureFlagPatterns = [
		/\#ifdef\b/,
		/\#if\s+defined\b/,
		/\#ifndef\b/,
		/\bFEATURE_FLAG\b/i,
		/\bIS_FEATURE_ENABLED\b/i,
		/\bFF_\w+/,
		/\bFEATURE_\w+/,
		/\bgetenv\b/,
		/\bconfig\.\w+\.enabled\b/i
	];

	protected extractFunctionName(match: string): string {
		// Handle class methods: ClassName::MethodName
		const methodMatch = match.match(/(\w+)\s*\(/);
		return methodMatch ? methodMatch[1] : 'anonymous';
	}

	protected extractParameters(match: string): string[] {
		const paramsMatch = match.match(/\(([^)]*)\)/);
		if (!paramsMatch || !paramsMatch[1].trim()) return [];

		return paramsMatch[1]
			.split(',')
			.map(p => p.trim())
			.filter(p => p.length > 0 && p !== 'void')
			.map(p => {
				// C++: type name or type* name or const type& name = default
				const withoutDefault = p.split('=')[0].trim();
				const parts = withoutDefault.split(/\s+/);
				// Get last part, removing any * or &
				let name = parts[parts.length - 1];
				name = name.replace(/^[*&]+/, '');
				return name;
			});
	}
}
