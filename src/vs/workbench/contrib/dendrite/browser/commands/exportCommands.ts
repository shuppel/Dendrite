/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Dendrite IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { WasmBridge } from '../wasmBridge.js';
import { DendriteStorageService } from '../storageService.js';
import { CommandIds } from '../../common/constants.js';
import { ExportFormat, ExportOptions } from '../../common/types.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';

/**
 * Register all export-related commands for Dendrite
 */
export function registerExportCommands(): void {
	// Export Portfolio (JSON) - Full portfolio export
	CommandsRegistry.registerCommand(CommandIds.EXPORT_JSON, async (accessor: ServicesAccessor) => {
		const fileDialogService = accessor.get(IFileDialogService);
		const fileService = accessor.get(IFileService);
		const notificationService = accessor.get(INotificationService);
		const storageService = accessor.get(IStorageService);

		try {
			const dendriteStorage = new DendriteStorageService(storageService);
			const profileJson = dendriteStorage.getProfileJson();
			
			const options: ExportOptions = {
				format: ExportFormat.JSON,
				include_commits: true,
				include_files: true
			};
			
			const exportData = WasmBridge.instance.exportJson(profileJson, JSON.stringify(options));
			
			const defaultUri = URI.file(`dendrite-portfolio-${getDateString()}.json`);
			const saveUri = await fileDialogService.showSaveDialog({
				defaultUri,
				filters: [{ name: 'JSON', extensions: ['json'] }],
				title: localize('dendrite.export.jsonTitle', "Export Dendrite Portfolio as JSON")
			});

			if (saveUri) {
				await fileService.writeFile(saveUri, VSBuffer.fromString(exportData));
				notificationService.notify({
					severity: Severity.Info,
					message: localize('dendrite.export.jsonSuccess', "Portfolio exported to {0}", saveUri.fsPath)
				});
			}
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('dendrite.export.error', "Failed to export: {0}", String(error))
			});
		}
	});

	// Export as Markdown
	CommandsRegistry.registerCommand(CommandIds.EXPORT_MARKDOWN, async (accessor: ServicesAccessor) => {
		const fileDialogService = accessor.get(IFileDialogService);
		const fileService = accessor.get(IFileService);
		const notificationService = accessor.get(INotificationService);
		const storageService = accessor.get(IStorageService);

		try {
			const dendriteStorage = new DendriteStorageService(storageService);
			const profileJson = dendriteStorage.getProfileJson();
			
			const options: ExportOptions = {
				format: ExportFormat.MARKDOWN,
				include_commits: true,
				include_files: true
			};
			
			const exportData = WasmBridge.instance.exportMarkdown(profileJson, JSON.stringify(options));
			
			const defaultUri = URI.file(`dendrite-portfolio-${getDateString()}.md`);
			const saveUri = await fileDialogService.showSaveDialog({
				defaultUri,
				filters: [{ name: 'Markdown', extensions: ['md'] }],
				title: localize('dendrite.export.mdTitle', "Export Dendrite Portfolio as Markdown")
			});

			if (saveUri) {
				await fileService.writeFile(saveUri, VSBuffer.fromString(exportData));
				notificationService.notify({
					severity: Severity.Info,
					message: localize('dendrite.export.mdSuccess', "Portfolio exported to {0}", saveUri.fsPath)
				});
			}
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('dendrite.export.error', "Failed to export: {0}", String(error))
			});
		}
	});

	// Export Heatmap as SVG
	CommandsRegistry.registerCommand(CommandIds.EXPORT_HEATMAP_SVG, async (accessor: ServicesAccessor) => {
		const fileDialogService = accessor.get(IFileDialogService);
		const fileService = accessor.get(IFileService);
		const notificationService = accessor.get(INotificationService);
		const clipboardService = accessor.get(IClipboardService);
		const storageService = accessor.get(IStorageService);

		try {
			const dendriteStorage = new DendriteStorageService(storageService);
			const profileJson = dendriteStorage.getProfileJson();
			
			const svgContent = WasmBridge.instance.exportHeatmapSvg(profileJson, 12);
			
			const defaultUri = URI.file(`dendrite-heatmap-${getDateString()}.svg`);
			const saveUri = await fileDialogService.showSaveDialog({
				defaultUri,
				filters: [{ name: 'SVG', extensions: ['svg'] }],
				title: localize('dendrite.export.svgTitle', "Export Heatmap as SVG")
			});

			if (saveUri) {
				await fileService.writeFile(saveUri, VSBuffer.fromString(svgContent));
				notificationService.notify({
					severity: Severity.Info,
					message: localize('dendrite.export.svgSuccess', "Heatmap exported to {0}", saveUri.fsPath),
					actions: {
						primary: [{
							id: 'copyToClipboard',
							label: localize('dendrite.export.copy', "Copy SVG to Clipboard"),
							tooltip: '',
							class: undefined,
							enabled: true,
							run: async () => {
								await clipboardService.writeText(svgContent);
								notificationService.info(localize('dendrite.export.copied', "SVG copied to clipboard"));
							}
						}]
					}
				});
			}
		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize('dendrite.export.error', "Failed to export: {0}", String(error))
			});
		}
	});

	// Legacy export command - opens quick pick to choose format
	CommandsRegistry.registerCommand(CommandIds.EXPORT_PORTFOLIO, async (accessor: ServicesAccessor) => {
		const commandService = accessor.get(ICommandService);
		const quickInputService = accessor.get(IQuickInputService);

		const items = [
			{ id: CommandIds.EXPORT_JSON, label: '$(json) JSON', description: 'Full portfolio data' },
			{ id: CommandIds.EXPORT_MARKDOWN, label: '$(markdown) Markdown', description: 'Human-readable report' },
			{ id: CommandIds.EXPORT_HEATMAP_SVG, label: '$(file-media) Heatmap SVG', description: 'Activity heatmap image' }
		];

		const selected = await quickInputService.pick(items, {
			placeHolder: localize('dendrite.export.pickFormat', "Choose export format")
		});

		if (selected) {
			await commandService.executeCommand(selected.id);
		}
	});
}

// Import additional services needed for the export command
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';

/**
 * Helper to get current date string for filenames
 */
function getDateString(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
