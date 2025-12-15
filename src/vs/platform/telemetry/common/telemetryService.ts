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
import { ITelemetryData, ITelemetryService, TelemetryConfiguration, TelemetryLevel, TELEMETRY_CRASH_REPORTER_SETTING_ID, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SECTION_ID, TELEMETRY_SETTING_ID, ICommonProperties } from './telemetry.js';
import { ITelemetryAppender } from './telemetryUtils.js';
import { isWeb } from '../../../base/common/platform.js';
import { PolicyCategory } from '../../../base/common/policy.js';

export interface ITelemetryServiceConfig {
	appenders: ITelemetryAppender[];
	sendErrorTelemetry?: boolean;
	commonProperties?: ICommonProperties;
	piiPaths?: string[];
}

export class TelemetryService implements ITelemetryService {

	static readonly IDLE_START_EVENT_NAME = 'UserIdleStart';
	static readonly IDLE_STOP_EVENT_NAME = 'UserIdleStop';

	declare readonly _serviceBrand: undefined;

	readonly sessionId = '00000000-0000-0000-0000-000000000000';
	readonly machineId = '00000000-0000-0000-0000-000000000000';
	readonly sqmId = '00000000-0000-0000-0000-000000000000';
	readonly devDeviceId = '00000000-0000-0000-0000-000000000000';
	readonly firstSessionDate = new Date().toISOString();
	readonly msftInternal = false;

	private readonly _disposables = new DisposableStore();

	constructor(
		config: ITelemetryServiceConfig,
		@IConfigurationService private _configurationService: IConfigurationService,
		@IProductService private _productService: IProductService
	) {
	}

	setExperimentProperty(name: string, value: string): void { }

	get sendErrorTelemetry(): boolean {
		return false;
	}

	get telemetryLevel(): TelemetryLevel {
		return TelemetryLevel.NONE;
	}

	dispose(): void {
		this._disposables.dispose();
	}

	publicLog(eventName: string, data?: ITelemetryData) { }

	publicLog2<E extends ClassifiedEvent<OmitMetadata<T>> = never, T extends IGDPRProperty = never>(eventName: string, data?: StrictPropertyCheck<T, E>) { }

	publicLogError(errorEventName: string, data?: ITelemetryData) { }

	publicLogError2<E extends ClassifiedEvent<OmitMetadata<T>> = never, T extends IGDPRProperty = never>(eventName: string, data?: StrictPropertyCheck<T, E>) { }
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
