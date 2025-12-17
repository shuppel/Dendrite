/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { CommandIds } from '../../common/constants.js';
import { SessionState } from '../../common/types.js';
import { DendriteSessionLifecycleService } from '../sessionLifecycleService.js';

/**
 * Session lifecycle commands interface
 * These commands need access to the singleton lifecycle service instance
 */
export interface ISessionCommandContext {
	lifecycleService: DendriteSessionLifecycleService;
}

let _sessionContext: ISessionCommandContext | undefined;

/**
 * Set the session context for commands
 * Must be called by the contribution during initialization
 */
export function setSessionCommandContext(context: ISessionCommandContext): void {
	_sessionContext = context;
}

/**
 * Register all session-related commands for Dendrite
 */
export function registerSessionCommands(): void {
	// Start Session
	CommandsRegistry.registerCommand(CommandIds.START_SESSION, (accessor: ServicesAccessor) => {
		const notificationService = accessor.get(INotificationService);

		if (!_sessionContext) {
			notificationService.error(localize('dendrite.session.notInitialized', "Dendrite is not initialized"));
			return;
		}

		const { lifecycleService } = _sessionContext;
		
		if (lifecycleService.state === SessionState.ACTIVE) {
			notificationService.info(localize('dendrite.session.alreadyActive', "Session is already active"));
			return;
		}

		lifecycleService.startSession();
		notificationService.notify({
			severity: Severity.Info,
			message: localize('dendrite.session.started', "Session started"),
			sticky: false
		});
	});

	// Pause Session
	CommandsRegistry.registerCommand(CommandIds.PAUSE_SESSION, (accessor: ServicesAccessor) => {
		const notificationService = accessor.get(INotificationService);

		if (!_sessionContext) {
			notificationService.error(localize('dendrite.session.notInitialized', "Dendrite is not initialized"));
			return;
		}

		const { lifecycleService } = _sessionContext;
		
		if (lifecycleService.state !== SessionState.ACTIVE) {
			notificationService.info(localize('dendrite.session.notActive', "No active session to pause"));
			return;
		}

		lifecycleService.pauseSession();
		notificationService.notify({
			severity: Severity.Info,
			message: localize('dendrite.session.paused', "Session paused"),
			actions: {
				primary: [{
					id: 'resume',
					label: localize('dendrite.session.resume', "Resume"),
					tooltip: '',
					class: undefined,
					enabled: true,
					run: () => lifecycleService.resumeSession()
				}]
			}
		});
	});

	// Resume Session
	CommandsRegistry.registerCommand(CommandIds.RESUME_SESSION, (accessor: ServicesAccessor) => {
		const notificationService = accessor.get(INotificationService);

		if (!_sessionContext) {
			notificationService.error(localize('dendrite.session.notInitialized', "Dendrite is not initialized"));
			return;
		}

		const { lifecycleService } = _sessionContext;
		
		if (lifecycleService.state === SessionState.ACTIVE) {
			notificationService.info(localize('dendrite.session.alreadyActive', "Session is already active"));
			return;
		}

		if (lifecycleService.state === SessionState.PAUSED) {
			lifecycleService.resumeSession();
			notificationService.info(localize('dendrite.session.resumed', "Session resumed"));
		} else if (lifecycleService.state === SessionState.ENDED || lifecycleService.state === SessionState.IDLE) {
			lifecycleService.startSession();
			notificationService.info(localize('dendrite.session.newStarted', "New session started"));
		}
	});

	// End Session
	CommandsRegistry.registerCommand(CommandIds.END_SESSION, (accessor: ServicesAccessor) => {
		const notificationService = accessor.get(INotificationService);

		if (!_sessionContext) {
			notificationService.error(localize('dendrite.session.notInitialized', "Dendrite is not initialized"));
			return;
		}

		const { lifecycleService } = _sessionContext;
		
		if (lifecycleService.state === SessionState.ENDED) {
			notificationService.info(localize('dendrite.session.noSession', "No active session to end"));
			return;
		}

		lifecycleService.endSession();
		notificationService.notify({
			severity: Severity.Info,
			message: localize('dendrite.session.ended', "Session ended and saved"),
			actions: {
				primary: [{
					id: 'startNew',
					label: localize('dendrite.session.startNew', "Start New"),
					tooltip: '',
					class: undefined,
					enabled: true,
					run: () => lifecycleService.startSession()
				}]
			}
		});
	});

	// Toggle Session (smart toggle based on current state)
	CommandsRegistry.registerCommand(CommandIds.TOGGLE_SESSION, (accessor: ServicesAccessor) => {
		const notificationService = accessor.get(INotificationService);

		if (!_sessionContext) {
			notificationService.error(localize('dendrite.session.notInitialized', "Dendrite is not initialized"));
			return;
		}

		const { lifecycleService } = _sessionContext;
		
		switch (lifecycleService.state) {
			case SessionState.ACTIVE:
				lifecycleService.pauseSession();
				notificationService.info(localize('dendrite.session.paused', "Session paused"));
				break;
			case SessionState.PAUSED:
				lifecycleService.resumeSession();
				notificationService.info(localize('dendrite.session.resumed', "Session resumed"));
				break;
			case SessionState.IDLE:
				// Resume from idle automatically transitions to active
				lifecycleService.startSession();
				notificationService.info(localize('dendrite.session.resumed', "Session resumed"));
				break;
			case SessionState.ENDED:
				lifecycleService.startSession();
				notificationService.info(localize('dendrite.session.started', "Session started"));
				break;
		}
	});

	// Show Stats
	CommandsRegistry.registerCommand(CommandIds.SHOW_STATS, (accessor: ServicesAccessor) => {
		const notificationService = accessor.get(INotificationService);

		if (!_sessionContext) {
			notificationService.error(localize('dendrite.session.notInitialized', "Dendrite is not initialized"));
			return;
		}

		// In future, this could show a modal or open the dashboard
		// For now, show a notification with basic info
		const { lifecycleService } = _sessionContext;
		const stateLabels: Record<SessionState, string> = {
			[SessionState.ACTIVE]: 'Active',
			[SessionState.PAUSED]: 'Paused',
			[SessionState.IDLE]: 'Idle',
			[SessionState.ENDED]: 'No session'
		};

		notificationService.notify({
			severity: Severity.Info,
			message: localize('dendrite.session.status', "Session Status: {0}", stateLabels[lifecycleService.state]),
			actions: {
				primary: [{
					id: 'openDashboard',
					label: localize('dendrite.session.openDashboard', "Open Dashboard"),
					tooltip: '',
					class: undefined,
					enabled: true,
					run: async () => {
						const commandService = accessor.get(ICommandService);
						await commandService.executeCommand('workbench.view.extension.growth');
					}
				}]
			}
		});
	});
}

import { ICommandService } from '../../../../../platform/commands/common/commands.js';
