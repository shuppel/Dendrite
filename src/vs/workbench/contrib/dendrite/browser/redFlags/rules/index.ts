/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RedFlagRule } from '../redFlagTypes.js';
import { DeepNestingRule } from './deepNesting.js';
import { LongFunctionRule } from './longFunction.js';
import { TooManyParamsRule } from './tooManyParams.js';
import { MagicNumbersRule } from './magicNumbers.js';
import { EmptyHandlersRule } from './emptyHandlers.js';
import { TodoAggregatorRule } from './todoAggregator.js';
import { FeatureFlagsRule } from './featureFlags.js';
import { DuplicateCodeRule } from './duplicateCode.js';

/**
 * All available red flag rules
 */
export const allRules: RedFlagRule[] = [
	new DeepNestingRule(),
	new LongFunctionRule(),
	new TooManyParamsRule(),
	new MagicNumbersRule(),
	new EmptyHandlersRule(),
	new TodoAggregatorRule(),
	new FeatureFlagsRule(),
	new DuplicateCodeRule()
];

/**
 * Get rules by category
 */
export function getRulesByCategory(category: string): RedFlagRule[] {
	return allRules.filter(rule => rule.category === category);
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string): RedFlagRule | undefined {
	return allRules.find(rule => rule.id === id);
}

export {
	DeepNestingRule,
	LongFunctionRule,
	TooManyParamsRule,
	MagicNumbersRule,
	EmptyHandlersRule,
	TodoAggregatorRule,
	FeatureFlagsRule,
	DuplicateCodeRule
};
