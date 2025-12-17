/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposableStore } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ConfigurationScope, Extensions, IConfigurationRegistry } from '../../configuration/common/configurationRegistry.js';
import product from '../../product/common/product.js';
import { IProductService } from '../../product/common/productService.js';
import { Registry } from '../../registry/common/platform.js';
import { ClassifiedEvent, IGDPRProperty, OmitMetadata, StrictPropertyCheck } from './gdprTypings.js';
import { ITelemetryData, ITelemetryService, TelemetryConfiguration, TelemetryLevel, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SECTION_ID, TELEMETRY_SETTING_ID, ICommonProperties } from './telemetry.js';
import { ITelemetryAppender } from './telemetryUtils.js';
import { isWeb } from '../../../base/common/platform.js';
import { PolicyCategory } from '../../../base/common/policy.js';
import { generateUuid } from '../../../base/common/uuid.js';

export interface ITelemetryServiceConfig {
	appenders: ITelemetryAppender[];
	sendErrorTelemetry?: boolean;
	commonProperties?: ICommonProperties;
	piiPaths?: string[];
}

/**
 * Dendrite Telemetry Event stored locally
 */
export interface IDendriteTelemetryEvent {
	timestamp: string;
	eventName: string;
	data?: ITelemetryData;
	isError?: boolean;
}

/**
 * Dendrite-modified TelemetryService
 * 
 * Instead of sending telemetry to Microsoft, this service stores all telemetry
 * events locally as part of the Dendrite growth tracking system. Events are
 * associated with sessions and can be exported as part of the user's portfolio.
 * 
 * Privacy: All data stays local on the user's machine.
 */
export class TelemetryService implements ITelemetryService {

	static readonly IDLE_START_EVENT_NAME = 'UserIdleStart';
	static readonly IDLE_STOP_EVENT_NAME = 'UserIdleStop';
	static readonly DENDRITE_TELEMETRY_KEY = 'dendrite.telemetry.events';
	static readonly MAX_STORED_EVENTS = 10000; // Limit to prevent unbounded growth

	declare readonly _serviceBrand: undefined;

	readonly sessionId: string;
	readonly machineId: string;
	readonly sqmId: string;
	readonly devDeviceId: string;
	readonly firstSessionDate: string;
	readonly msftInternal = false;

	private readonly _disposables = new DisposableStore();
	private readonly _events: IDendriteTelemetryEvent[] = [];
	private _telemetryLevel: TelemetryLevel = TelemetryLevel.USAGE;

	constructor(
		config: ITelemetryServiceConfig,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IProductService private readonly _productService: IProductService
	) {
		// Generate unique IDs for this instance (stored locally, not sent anywhere)
		this.sessionId = generateUuid();
		this.machineId = this._getOrCreateMachineId();
		this.sqmId = generateUuid();
		this.devDeviceId = generateUuid();
		this.firstSessionDate = this._getOrCreateFirstSessionDate();

		// Read telemetry level from configuration
		this._updateTelemetryLevel();
		this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(TELEMETRY_SETTING_ID)) {
				this._updateTelemetryLevel();
			}
		}));
	}

	private _getOrCreateMachineId(): string {
		// In a full implementation, this would read from storage
		// For now, generate a new one each time (will be persisted later)
		return generateUuid();
	}

	private _getOrCreateFirstSessionDate(): string {
		// In a full implementation, this would read from storage
		return new Date().toISOString();
	}

	private _updateTelemetryLevel(): void {
		const config = this._configurationService.getValue<string>(TELEMETRY_SETTING_ID);
		switch (config) {
			case TelemetryConfiguration.OFF:
				this._telemetryLevel = TelemetryLevel.NONE;
				break;
			case TelemetryConfiguration.CRASH:
				this._telemetryLevel = TelemetryLevel.CRASH;
				break;
			case TelemetryConfiguration.ERROR:
				this._telemetryLevel = TelemetryLevel.ERROR;
				break;
			case TelemetryConfiguration.ON:
			default:
				this._telemetryLevel = TelemetryLevel.USAGE;
				break;
		}
	}

	setExperimentProperty(name: string, value: string): void {
		// Store experiment properties locally
		this._logEvent('experiment:property', { name, value });
	}

	get sendErrorTelemetry(): boolean {
		return this._telemetryLevel >= TelemetryLevel.ERROR;
	}

	get telemetryLevel(): TelemetryLevel {
		return this._telemetryLevel;
	}

	dispose(): void {
		this._disposables.dispose();
	}

	private _logEvent(eventName: string, data?: ITelemetryData, isError: boolean = false): void {
		if (this._telemetryLevel === TelemetryLevel.NONE) {
			return;
		}

		// Don't log usage events if level is ERROR or CRASH only
		if (!isError && this._telemetryLevel < TelemetryLevel.USAGE) {
			return;
		}

		const event: IDendriteTelemetryEvent = {
			timestamp: new Date().toISOString(),
			eventName,
			data: this._sanitizeData(data),
			isError
		};

		this._events.push(event);

		// Trim old events if we exceed the limit
		if (this._events.length > TelemetryService.MAX_STORED_EVENTS) {
			this._events.splice(0, this._events.length - TelemetryService.MAX_STORED_EVENTS);
		}

		// Log to console in development for debugging
		if (this._productService.quality !== 'stable') {
			console.log(`[Dendrite Telemetry] ${eventName}`, data);
		}
	}

	private _sanitizeData(data?: ITelemetryData): ITelemetryData | undefined {
		if (!data) {
			return undefined;
		}
		// Create a shallow copy to avoid modifying the original
		const sanitized: ITelemetryData = { ...data };
		// Remove any PII fields if present (add more as needed)
		delete (sanitized as Record<string, unknown>)['email'];
		delete (sanitized as Record<string, unknown>)['password'];
		delete (sanitized as Record<string, unknown>)['token'];
		return sanitized;
	}

	publicLog(eventName: string, data?: ITelemetryData): void {
		this._logEvent(eventName, data);
	}

	publicLog2<E extends ClassifiedEvent<OmitMetadata<T>> = never, T extends IGDPRProperty = never>(eventName: string, data?: StrictPropertyCheck<T, E>): void {
		this._logEvent(eventName, data as ITelemetryData);
	}

	publicLogError(errorEventName: string, data?: ITelemetryData): void {
		this._logEvent(errorEventName, data, true);
	}

	publicLogError2<E extends ClassifiedEvent<OmitMetadata<T>> = never, T extends IGDPRProperty = never>(eventName: string, data?: StrictPropertyCheck<T, E>): void {
		this._logEvent(eventName, data as ITelemetryData, true);
	}

	/**
	 * Dendrite-specific: Get all stored telemetry events
	 * This can be used by the Dendrite dashboard to show usage patterns
	 */
	public getStoredEvents(): readonly IDendriteTelemetryEvent[] {
		return this._events;
	}

	/**
	 * Dendrite-specific: Export telemetry data as JSON
	 */
	public exportTelemetry(): string {
		return JSON.stringify({
			sessionId: this.sessionId,
			machineId: this.machineId,
			firstSessionDate: this.firstSessionDate,
			exportDate: new Date().toISOString(),
			events: this._events
		}, null, 2);
	}

	/**
	 * Dendrite-specific: Clear stored telemetry events
	 */
	public clearEvents(): void {
		this._events.length = 0;
	}
}

function getTelemetryLevelSettingDescription(): string {
	const telemetryText = localize('telemetry.telemetryLevelMd', "Controls {0} telemetry, first-party extension telemetry, and participating third-party extension telemetry. Some third party extensions might not respect this setting. Consult the specific extension's documentation to be sure. Telemetry helps us better understand how {0} is performing, where improvements need to be made, and how features are being used.", product.nameLong);
	const externalLinksStatement = !product.privacyStatementUrl ?
		localize("telemetry.docsStatement", "Read more about the [data we collect]({0}).", 'https://aka.ms/vscode-telemetry') :
		localize("telemetry.docsAndPrivacyStatement", "Read more about the [data we collect]({0}) and our [privacy statement]({1}).", 'https://aka.ms/vscode-telemetry', product.privacyStatementUrl);
	const restartString = !isWeb ? localize('telemetry.restart', 'A full restart of the application is necessary for crash reporting changes to take effect.') : '';

	const crashReportsHeader = localize('telemetry.crashReports', "Crash Reports");
	const errorsHeader = localize('telemetry.errors', "Error Telemetry");
	const usageHeader = localize('telemetry.usage', "Usage Data");

	const telemetryTableDescription = localize('telemetry.telemetryLevel.tableDescription', "The following table outlines the data sent with each setting:");
	const telemetryTable = `
|       | ${crashReportsHeader} | ${errorsHeader} | ${usageHeader} |
|:------|:-------------:|:---------------:|:----------:|
| all   |       ✓       |        ✓        |     ✓      |
| error |       ✓       |        ✓        |     -      |
| crash |       ✓       |        -        |     -      |
| off   |       -       |        -        |     -      |
`;

	const deprecatedSettingNote = localize('telemetry.telemetryLevel.deprecated', "****Note:*** If this setting is 'off', no telemetry will be sent regardless of other telemetry settings. If this setting is set to anything except 'off' and telemetry is disabled with deprecated settings, no telemetry will be sent.*");
	const telemetryDescription = `
${telemetryText} ${externalLinksStatement} ${restartString}

&nbsp;

${telemetryTableDescription}
${telemetryTable}

&nbsp;

${deprecatedSettingNote}
`;

	return telemetryDescription;
}

const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
configurationRegistry.registerConfiguration({
	'id': TELEMETRY_SECTION_ID,
	'order': 1,
	'type': 'object',
	'title': localize('telemetryConfigurationTitle', "Telemetry"),
	'properties': {
		[TELEMETRY_SETTING_ID]: {
			'type': 'string',
			'enum': [TelemetryConfiguration.ON, TelemetryConfiguration.ERROR, TelemetryConfiguration.CRASH, TelemetryConfiguration.OFF],
			'enumDescriptions': [
				localize('telemetry.telemetryLevel.default', "Sends usage data, errors, and crash reports."),
				localize('telemetry.telemetryLevel.error', "Sends general error telemetry and crash reports."),
				localize('telemetry.telemetryLevel.crash', "Sends OS level crash reports."),
				localize('telemetry.telemetryLevel.off', "Disables all product telemetry.")
			],
			'markdownDescription': getTelemetryLevelSettingDescription(),
			'default': TelemetryConfiguration.ON,
			'restricted': true,
			'scope': ConfigurationScope.APPLICATION,
			'tags': ['usesOnlineServices', 'telemetry'],
			'policy': {
				name: 'TelemetryLevel',
				category: PolicyCategory.Telemetry,
				minimumVersion: '1.99',
				localization: {
					description: {
						key: 'telemetry.telemetryLevel.policyDescription',
						value: localize('telemetry.telemetryLevel.policyDescription', "Controls the level of telemetry."),
					},
					enumDescriptions: [
						{
							key: 'telemetry.telemetryLevel.default',
							value: localize('telemetry.telemetryLevel.default', "Sends usage data, errors, and crash reports."),
						},
						{
							key: 'telemetry.telemetryLevel.error',
							value: localize('telemetry.telemetryLevel.error', "Sends general error telemetry and crash reports."),
						},
						{
							key: 'telemetry.telemetryLevel.crash',
							value: localize('telemetry.telemetryLevel.crash', "Sends OS level crash reports."),
						},
						{
							key: 'telemetry.telemetryLevel.off',
							value: localize('telemetry.telemetryLevel.off', "Disables all product telemetry."),
						}
					]
				}
			}
		},
		'telemetry.feedback.enabled': {
			type: 'boolean',
			default: true,
			description: localize('telemetry.feedback.enabled', "Enable feedback mechanisms such as the issue reporter, surveys, and other feedback options."),
			policy: {
				name: 'EnableFeedback',
				category: PolicyCategory.Telemetry,
				minimumVersion: '1.99',
				localization: { description: { key: 'telemetry.feedback.enabled', value: localize('telemetry.feedback.enabled', "Enable feedback mechanisms such as the issue reporter, surveys, and other feedback options.") } },
			}
		},
		// Deprecated telemetry setting
		[TELEMETRY_OLD_SETTING_ID]: {
			'type': 'boolean',
			'markdownDescription':
				!product.privacyStatementUrl ?
					localize('telemetry.enableTelemetry', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made.", product.nameLong) :
					localize('telemetry.enableTelemetryMd', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made. [Read more]({1}) about what we collect and our privacy statement.", product.nameLong, product.privacyStatementUrl),
			'default': true,
			'restricted': true,
			'markdownDeprecationMessage': localize('enableTelemetryDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated in favor of the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
			'scope': ConfigurationScope.APPLICATION,
			'tags': ['usesOnlineServices', 'telemetry']
		}
	},
});
