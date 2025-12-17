/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Re-export types from baseAnalyzer
export { ExtractedFunction, LanguageAnalyzer, BaseLanguageAnalyzer } from './baseAnalyzer.js';

// Import language-specific analyzers
import { TypeScriptAnalyzer } from './typescript.js';
import { PythonAnalyzer } from './python.js';
import { RustAnalyzer } from './rust.js';
import { GoAnalyzer } from './go.js';
import { JavaAnalyzer } from './java.js';
import { CSharpAnalyzer } from './csharp.js';
import { CppAnalyzer } from './cpp.js';
import { LanguageAnalyzer } from './baseAnalyzer.js';

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
