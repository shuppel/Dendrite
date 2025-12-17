/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


/**
 * Code quality metrics
 */

export interface CodeMetrics {
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	lines: number;
	parameters: number;
	maxNestingDepth: number;
	hasFeatureFlags: boolean;
}

export interface FunctionMetrics extends CodeMetrics {
	name: string;
	startLine: number;
	endLine: number;
	range: {
		startLine: number;
		startColumn: number;
		endLine: number;
		endColumn: number;
	};
}

export interface FileMetrics {
	uri: string;
	language: string;
	functions: FunctionMetrics[];
	overallComplexity: number;
}

export interface ComplexityResult {
	metrics: CodeMetrics;
	severity: 'healthy' | 'warning' | 'critical';
	reasons: string[];
}

/**
 * Calculate cyclomatic complexity from decision point count
 * CC = number of decisions + 1
 */
export function calculateCyclomaticComplexity(decisionPoints: number): number {
	return decisionPoints + 1;
}

/**
 * Calculate cognitive complexity with nesting weight
 * Base score for decisions, multiplied by nesting depth
 */
export function calculateCognitiveComplexity(
	decisionPoints: number,
	nestingDepth: number,
	sequenceBreaks: number
): number {
	// Base decisions
	let cognitive = decisionPoints;

	// Nesting penalty: each level of nesting multiplies complexity
	cognitive += decisionPoints * Math.max(0, nestingDepth - 1);

	// Sequence breaks (early returns, throws, etc.)
	cognitive += sequenceBreaks * 2;

	return cognitive;
}

/**
 * Determine severity based on metrics
 */
export function determineComplexitySeverity(metrics: CodeMetrics): ComplexityResult['severity'] {
	const reasons: string[] = [];

	// Cyclomatic complexity thresholds
	if (metrics.cyclomaticComplexity > 20) {
		return 'critical';
	}
	if (metrics.cyclomaticComplexity > 10) {
		return 'warning';
	}

	// Cognitive complexity thresholds (more lenient)
	if (metrics.cognitiveComplexity > 30) {
		return 'critical';
	}
	if (metrics.cognitiveComplexity > 15) {
		return 'warning';
	}

	// Function length
	if (metrics.lines > 100) {
		return 'critical';
	}
	if (metrics.lines > 50) {
		return 'warning';
	}

	// Nesting depth
	if (metrics.maxNestingDepth > 5) {
		return 'critical';
	}
	if (metrics.maxNestingDepth > 4) {
		return 'warning';
	}

	// Parameters
	if (metrics.parameters > 8) {
		return 'critical';
	}
	if (metrics.parameters > 5) {
		return 'warning';
	}

	return 'healthy';
}

/**
 * Get severity reasons for display
 */
export function getComplexityReasons(metrics: CodeMetrics): string[] {
	const reasons: string[] = [];

	if (metrics.cyclomaticComplexity > 20) {
		reasons.push(`Cyclomatic complexity ${metrics.cyclomaticComplexity} (critical: > 20)`);
	} else if (metrics.cyclomaticComplexity > 10) {
		reasons.push(`Cyclomatic complexity ${metrics.cyclomaticComplexity} (warning: > 10)`);
	}

	if (metrics.cognitiveComplexity > 30) {
		reasons.push(`Cognitive complexity ${metrics.cognitiveComplexity} (critical: > 30)`);
	} else if (metrics.cognitiveComplexity > 15) {
		reasons.push(`Cognitive complexity ${metrics.cognitiveComplexity} (warning: > 15)`);
	}

	if (metrics.lines > 100) {
		reasons.push(`Function length ${metrics.lines} lines (critical: > 100)`);
	} else if (metrics.lines > 50) {
		reasons.push(`Function length ${metrics.lines} lines (warning: > 50)`);
	}

	if (metrics.maxNestingDepth > 5) {
		reasons.push(`Nesting depth ${metrics.maxNestingDepth} (critical: > 5)`);
	} else if (metrics.maxNestingDepth > 4) {
		reasons.push(`Nesting depth ${metrics.maxNestingDepth} (warning: > 4)`);
	}

	if (metrics.parameters > 8) {
		reasons.push(`Parameters: ${metrics.parameters} (critical: > 8)`);
	} else if (metrics.parameters > 5) {
		reasons.push(`Parameters: ${metrics.parameters} (warning: > 5)`);
	}

	if (metrics.hasFeatureFlags) {
		reasons.push('Contains feature flag wraps (review for dead code)');
	}

	return reasons;
}
