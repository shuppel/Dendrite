
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { DENDRITE_VIEW_CONTAINER_ID } from '../common/constants.js';

export class GrowthViewPaneContainer extends ViewPaneContainer {
    constructor(
        @IConfigurationService configurationService: IConfigurationService,
        @IContextMenuService contextMenuService: IContextMenuService,
        @IKeybindingService keybindingService: IKeybindingService,
        @IInstantiationService instantiationService: IInstantiationService,
        @IThemeService themeService: IThemeService,
        @ITelemetryService telemetryService: ITelemetryService,
        @IExtensionService extensionService: IExtensionService,
        @IStorageService storageService: IStorageService,
        @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
        @ILoggerService loggerService: ILoggerService,
        @IOpenerService openerService: IOpenerService,
        @IContextKeyService contextKeyService: IContextKeyService,
    ) {
        super(
            DENDRITE_VIEW_CONTAINER_ID,
            { mergeViewWithContainerWhenSingleView: true },
            instantiationService,
            configurationService,
            themeService,
            contextMenuService,
            telemetryService,
            extensionService,
            storageService,
            contextKeyService,
            viewDescriptorService,
            keybindingService,
            openerService,
            loggerService
        );
    }
}
