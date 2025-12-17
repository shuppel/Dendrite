/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { registerExportCommands } from './exportCommands.js';
import { registerBadgeCommands } from './badgeCommands.js';
import { registerSessionCommands } from './sessionCommands.js';

// Re-export for external use
export { registerExportCommands } from './exportCommands.js';
export { registerBadgeCommands } from './badgeCommands.js';
export { registerSessionCommands, setSessionCommandContext } from './sessionCommands.js';
export type { ISessionCommandContext } from './sessionCommands.js';

/**
 * Register all Dendrite commands
 */
export function registerAllCommands(): void {
	registerExportCommands();
	registerBadgeCommands();
	registerSessionCommands();
}
