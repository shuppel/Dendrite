/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ConfigKeys } from '../../common/constants.js';
import { SmoothCursorAddon, CursorPhysics } from './smoothCursorAddon.js';

/**
 * Terminal velocity configuration interface
 */
export interface ITerminalVelocityConfig {
	smoothCursor: boolean;
	cursorPhysics: CursorPhysics;
	forceGPU: boolean;
	targetFPS: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ITerminalVelocityConfig = {
	smoothCursor: true,
	cursorPhysics: {
		duration: 80,
		easing: 'ease-out'
	},
	forceGPU: true,
	targetFPS: 60
};

/**
 * TerminalVelocityService
 *
 * Manages terminal velocity settings and coordinates updates to SmoothCursorAddon instances.
 * Listens to configuration changes and applies them dynamically without requiring terminal restart.
 */
export class TerminalVelocityService extends Disposable {
	private readonly _addons: Map<number, SmoothCursorAddon> = new Map();
	private _config: ITerminalVelocityConfig = DEFAULT_CONFIG;
	private _nextAddonId: number = 0;

	constructor(
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super();

		// Load initial configuration
		this._loadConfig();

		// Listen for configuration changes
		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('dendrite.terminal')) {
				this._loadConfig();
				this._updateAllAddons();
			}
		}));
	}

	/**
	 * Load configuration from settings
	 */
	private _loadConfig(): void {
		const smoothCursor = this._configurationService.getValue<boolean>(ConfigKeys.TERMINAL_SMOOTH_CURSOR) ?? DEFAULT_CONFIG.smoothCursor;
		const cursorPhysics = this._configurationService.getValue<CursorPhysics>(ConfigKeys.TERMINAL_CURSOR_PHYSICS) ?? DEFAULT_CONFIG.cursorPhysics;
		const forceGPU = this._configurationService.getValue<boolean>(ConfigKeys.TERMINAL_FORCE_GPU) ?? DEFAULT_CONFIG.forceGPU;
		const targetFPS = this._configurationService.getValue<number>(ConfigKeys.TERMINAL_TARGET_FPS) ?? DEFAULT_CONFIG.targetFPS;

		// Validate and clamp values
		this._config = {
			smoothCursor,
			cursorPhysics: {
				duration: Math.max(20, Math.min(200, cursorPhysics.duration ?? 80)),
				easing: this._validateEasing(cursorPhysics.easing)
			},
			forceGPU,
			targetFPS: Math.max(30, Math.min(120, targetFPS))
		};
	}

	/**
	 * Validate easing function
	 */
	private _validateEasing(easing: string | undefined): CursorPhysics['easing'] {
		const validEasings: CursorPhysics['easing'][] = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'];
		if (easing && validEasings.includes(easing as CursorPhysics['easing'])) {
			return easing as CursorPhysics['easing'];
		}
		return 'ease-out';
	}

	/**
	 * Get current configuration
	 */
	public get config(): Readonly<ITerminalVelocityConfig> {
		return this._config;
	}

	/**
	 * Check if smooth cursor should be enabled
	 */
	public get isSmoothCursorEnabled(): boolean {
		return this._config.smoothCursor;
	}

	/**
	 * Check if GPU acceleration should be forced
	 */
	public get isForceGPUEnabled(): boolean {
		return this._config.forceGPU;
	}

	/**
	 * Create a new SmoothCursorAddon with current configuration
	 */
	public createAddon(): SmoothCursorAddon {
		const addon = new SmoothCursorAddon({
			enabled: this._config.smoothCursor,
			physics: this._config.cursorPhysics,
			targetFPS: this._config.targetFPS
		});

		const id = this._nextAddonId++;
		this._addons.set(id, addon);

		// Clean up when addon is disposed
		const disposable = new DisposableStore();
		disposable.add(addon);
		disposable.add({
			dispose: () => {
				this._addons.delete(id);
			}
		});

		return addon;
	}

	/**
	 * Register an existing addon to receive config updates
	 */
	public registerAddon(addon: SmoothCursorAddon): number {
		const id = this._nextAddonId++;
		this._addons.set(id, addon);
		return id;
	}

	/**
	 * Unregister an addon
	 */
	public unregisterAddon(id: number): void {
		this._addons.delete(id);
	}

	/**
	 * Update all registered addons with current configuration
	 */
	private _updateAllAddons(): void {
		for (const addon of this._addons.values()) {
			this._updateAddon(addon);
		}
	}

	/**
	 * Update a single addon with current configuration
	 */
	private _updateAddon(addon: SmoothCursorAddon): void {
		// Update enabled state
		addon.setEnabled(this._config.smoothCursor);

		// Update physics
		addon.updatePhysics(this._config.cursorPhysics);

		// Update target FPS
		addon.updateTargetFPS(this._config.targetFPS);

		// Refresh style in case cursor style changed
		addon.refreshStyle();
	}

	/**
	 * Get the number of registered addons (for testing/debugging)
	 */
	public get addonCount(): number {
		return this._addons.size;
	}

	override dispose(): void {
		// Dispose all addons
		for (const addon of this._addons.values()) {
			addon.dispose();
		}
		this._addons.clear();

		super.dispose();
	}
}
