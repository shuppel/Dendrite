/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


/**
 * Red flag severity levels
 */
export type RedFlagSeverity = 'info' | 'warning' | 'critical';

/**
 * Red flag categories
 */
export type RedFlagCategory =
	| 'complexity'
	| 'length'
	| 'nesting'
	| 'parameters'
	| 'magic-number'
	| 'empty-handler'
	| 'duplicate'
	| 'todo'
	| 'feature-flag';

/**
 * A detected red flag in code
 */
export interface RedFlag {
	id: string;
	category: RedFlagCategory;
	severity: RedFlagSeverity;
	message: string;
	file: string;
	line: number;
	endLine?: number;
	column: number;
	endColumn?: number;
	functionName?: string;
	details?: string;
	suggestion?: string;
}

/**
 * Rule interface for red flag detection
 */
export interface RedFlagRule {
	id: string;
	name: string;
	category: RedFlagCategory;
	description: string;
	detect(source: string, filePath: string, language: string): RedFlag[];
}

/**
 * Summary of red flags in a file
 */
export interface RedFlagFileSummary {
	file: string;
	healthyCount: number;
	warningCount: number;
	criticalCount: number;
	flags: RedFlag[];
}

/**
 * Overall project red flag summary
 */
export interface RedFlagProjectSummary {
	totalFiles: number;
	healthyFiles: number;
	warningFiles: number;
	criticalFiles: number;
	files: RedFlagFileSummary[];
}
