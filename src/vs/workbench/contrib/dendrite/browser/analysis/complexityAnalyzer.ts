/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel } from '../../../../editor/common/model.js';
import { FunctionMetrics, CodeMetrics, FileMetrics } from './metrics.js';
import { TreeSitterBridge } from './treeSitterBridge.js';
import { getLanguageAnalyzer, LanguageAnalyzer } from './languages/index.js';

/**
 * Main complexity analyzer that uses tree-sitter for AST-based analysis
 */
export class ComplexityAnalyzer {
	private treeSitter: TreeSitterBridge;
	private languageAnalyzer: LanguageAnalyzer | undefined;

	constructor() {
		this.treeSitter = new TreeSitterBridge();
	}

	/**
	 * Analyze a text model and extract function-level metrics
	 */
	async analyzeFile(model: ITextModel): Promise<FileMetrics | null> {
		try {
			const language = this.getLanguageFromModel(model);
			const analyzer = getLanguageAnalyzer(language);

			if (!analyzer) {
				return null; // Language not supported
			}

			this.languageAnalyzer = analyzer;
			const text = model.getValue();

			// Get tree from tree-sitter
			const tree = await this.treeSitter.parse(text, language);
			if (!tree) {
				return null;
			}

			// Extract functions from tree
			const functions = analyzer.extractFunctions(tree, text);

			// Calculate metrics for each function
			const functionMetrics: FunctionMetrics[] = [];
			for (const fn of functions) {
				const metrics = analyzer.calculateMetrics(fn, text);
				functionMetrics.push(metrics);
			}

			// Calculate overall file complexity (average of functions)
			const overallComplexity =
				functionMetrics.length > 0
					? functionMetrics.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) /
					  functionMetrics.length
					: 0;

			return {
				uri: model.uri.toString(),
				language,
				functions: functionMetrics,
				overallComplexity
			};
		} catch (error) {
			console.error('Error analyzing file:', error);
			return null;
		}
	}

	/**
	 * Get language from model
	 */
	private getLanguageFromModel(model: ITextModel): string {
		const id = model.getLanguageId();
		// Map VS Code language IDs to tree-sitter language names
		const languageMap: Record<string, string> = {
			typescript: 'typescript',
			javascript: 'javascript',
			python: 'python',
			rust: 'rust',
			go: 'go',
			java: 'java',
			csharp: 'csharp',
			cpp: 'cpp',
			c: 'c'
		};
		return languageMap[id] || id;
	}
}

/**
 * Singleton analyzer instance
 */
let analyzerInstance: ComplexityAnalyzer | null = null;

export function getComplexityAnalyzer(): ComplexityAnalyzer {
	if (!analyzerInstance) {
		analyzerInstance = new ComplexityAnalyzer();
	}
	return analyzerInstance;
}
