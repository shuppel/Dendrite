/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RedFlagRule, RedFlag } from '../redFlagTypes.js';

/**
 * Detects feature flag wraps that may indicate dead code or technical debt
 */
export class FeatureFlagsRule implements RedFlagRule {
	id = 'feature-flags';
	name = 'Feature Flag Detection';
	category = 'feature-flag' as const;
	description = 'Detects feature flag wraps for code review';

	private readonly patterns: { pattern: RegExp; type: string }[] = [
		// Common feature flag patterns
		{ pattern: /\bif\s*\(\s*(?:isFeatureEnabled|featureFlag|FF_|FEATURE_)\w*/gi, type: 'conditional' },
		{ pattern: /\bif\s*\(\s*(?:flags?|features?|config)\.\w+/gi, type: 'conditional' },

		// Environment variable checks
		{ pattern: /process\.env\.\w+/g, type: 'env-var' },
		{ pattern: /os\.environ(?:\[|\.get)/g, type: 'env-var' },
		{ pattern: /System\.getenv/g, type: 'env-var' },
		{ pattern: /std::env::var/g, type: 'env-var' },
		{ pattern: /os\.Getenv/g, type: 'env-var' },

		// Compile-time flags (C/C++, Rust)
		{ pattern: /#ifdef\s+\w+/g, type: 'preprocessor' },
		{ pattern: /#if\s+defined\s*\(\s*\w+/g, type: 'preprocessor' },
		{ pattern: /#\[cfg\([^\]]+\)\]/g, type: 'rust-cfg' },

		// Framework-specific
		{ pattern: /@FeatureToggle/g, type: 'annotation' },
		{ pattern: /@FeatureGate/g, type: 'annotation' },
		{ pattern: /\bLaunchDarkly\b/gi, type: 'service' },
		{ pattern: /\bUnleash\b/gi, type: 'service' },
		{ pattern: /\bSplit\b\.\w+/g, type: 'service' }
	];

	detect(source: string, filePath: string, language: string): RedFlag[] {
		const flags: RedFlag[] = [];
		const seenLines = new Set<number>();

		for (const { pattern, type } of this.patterns) {
			let match;
			const regex = new RegExp(pattern.source, pattern.flags);

			while ((match = regex.exec(source)) !== null) {
				const line = source.substring(0, match.index).split('\n').length - 1;

				// Avoid duplicate flags on same line
				if (seenLines.has(line)) continue;
				seenLines.add(line);

				const matchText = match[0];
				const flagName = this.extractFlagName(matchText);

				flags.push({
					id: `${this.id}-${line}`,
					category: this.category,
					severity: 'info',
					message: `Feature flag detected: ${flagName}`,
					file: filePath,
					line,
					column: match.index - source.lastIndexOf('\n', match.index) - 1,
					details: `Type: ${type}`,
					suggestion: 'Review if this flag is still needed or if the code should be cleaned up'
				});
			}
		}

		return flags;
	}

	private extractFlagName(match: string): string {
		// Try to extract the flag name from the match
		const patterns = [
			/FF_\w+/,
			/FEATURE_\w+/,
			/isFeatureEnabled\(['"](\w+)['"]\)/,
			/featureFlag\(['"](\w+)['"]\)/,
			/flags?\.(\w+)/,
			/features?\.(\w+)/,
			/config\.(\w+)/,
			/process\.env\.(\w+)/,
			/#ifdef\s+(\w+)/,
			/cfg\((\w+)/
		];

		for (const pattern of patterns) {
			const m = match.match(pattern);
			if (m) {
				return m[1] || m[0];
			}
		}

		return match.substring(0, 30) + (match.length > 30 ? '...' : '');
	}
}
