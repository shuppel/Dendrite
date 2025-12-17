/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { WasmBridge } from '../wasmBridge.js';
import { DendriteStorageService } from '../storageService.js';
import { CommandIds } from '../../common/constants.js';

/**
 * Register all badge-related commands for Dendrite
 */
export function registerBadgeCommands(): void {
	// Copy Badge SVG to clipboard
	CommandsRegistry.registerCommand(CommandIds.COPY_BADGE_SVG, async (accessor: ServicesAccessor) => {
		const clipboardService = accessor.get(IClipboardService);
		const notificationService = accessor.get(INotificationService);
		const storageService = accessor.get(IStorageService);

		try {
			const dendriteStorage = new DendriteStorageService(storageService);
			const profileJson = dendriteStorage.getProfileJson();
			
			const badgeSvg = WasmBridge.instance.generateBadgeSvg(profileJson);
			await clipboardService.writeText(badgeSvg);
			
			notificationService.notify({
				severity: Severity.Info,
				message: localize('dendrite.badge.svgCopied', "Badge SVG copied to clipboard"),
				actions: {
					primary: [{
						id: 'viewBadge',
						label: localize('dendrite.badge.preview', "Preview"),
						tooltip: localize('dendrite.badge.previewTooltip', "Open badge preview"),
						class: undefined,
						enabled: true,
						run: () => {
							// In future, could open a preview webview
							notificationService.info(localize('dendrite.badge.previewInfo', "Paste the SVG in any image viewer to preview"));
						}
					}]
				}
			});
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('dendrite.badge.error', "Failed to generate badge: {0}", String(error))
			});
		}
	});

	// Copy Badge URL (shields.io style)
	CommandsRegistry.registerCommand(CommandIds.COPY_BADGE_URL, async (accessor: ServicesAccessor) => {
		const clipboardService = accessor.get(IClipboardService);
		const notificationService = accessor.get(INotificationService);
		const storageService = accessor.get(IStorageService);

		try {
			const dendriteStorage = new DendriteStorageService(storageService);
			const profileJson = dendriteStorage.getProfileJson();
			
			const badgeUrl = WasmBridge.instance.generateBadgeUrl(profileJson);
			await clipboardService.writeText(badgeUrl);
			
			notificationService.notify({
				severity: Severity.Info,
				message: localize('dendrite.badge.urlCopied', "Badge URL copied to clipboard"),
				actions: {
					primary: [{
						id: 'copyMarkdown',
						label: localize('dendrite.badge.copyMarkdown', "Copy as Markdown"),
						tooltip: '',
						class: undefined,
						enabled: true,
						run: async () => {
							const markdown = `![Coding Activity](${badgeUrl})`;
							await clipboardService.writeText(markdown);
							notificationService.info(localize('dendrite.badge.markdownCopied', "Markdown badge copied to clipboard"));
						}
					}]
				}
			});
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('dendrite.badge.error', "Failed to generate badge: {0}", String(error))
			});
		}
	});

	// Legacy copy badge command - opens quick pick to choose type
	CommandsRegistry.registerCommand(CommandIds.COPY_BADGE, async (accessor: ServicesAccessor) => {
		const quickInputService = accessor.get(IQuickInputService);
		const clipboardService = accessor.get(IClipboardService);
		const notificationService = accessor.get(INotificationService);
		const storageService = accessor.get(IStorageService);

		const items = [
			{ 
				id: 'svg', 
				label: '$(file-media) SVG Badge', 
				description: 'Raw SVG for embedding anywhere' 
			},
			{ 
				id: 'url', 
				label: '$(link) Badge URL', 
				description: 'shields.io compatible URL' 
			},
			{ 
				id: 'markdown', 
				label: '$(markdown) Markdown', 
				description: 'Ready to paste in README' 
			},
			{ 
				id: 'html', 
				label: '$(code) HTML', 
				description: 'HTML img tag' 
			}
		];

		const selected = await quickInputService.pick(items, {
			placeHolder: localize('dendrite.badge.pickFormat', "Choose badge format")
		});

		if (!selected) {
			return;
		}

		try {
			const dendriteStorage = new DendriteStorageService(storageService);
			const profileJson = dendriteStorage.getProfileJson();
			let content: string;

			switch (selected.id) {
				case 'svg':
					content = WasmBridge.instance.generateBadgeSvg(profileJson);
					break;
				case 'url':
					content = WasmBridge.instance.generateBadgeUrl(profileJson);
					break;
				case 'markdown': {
					const url = WasmBridge.instance.generateBadgeUrl(profileJson);
					content = `![Coding Activity](${url})`;
					break;
				}
				case 'html': {
					const url = WasmBridge.instance.generateBadgeUrl(profileJson);
					content = `<img src="${url}" alt="Coding Activity" />`;
					break;
				}
				default:
					return;
			}

			await clipboardService.writeText(content);
			notificationService.info(localize('dendrite.badge.copied', "Badge copied to clipboard"));
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('dendrite.badge.error', "Failed to generate badge: {0}", String(error))
			});
		}
	});
}
