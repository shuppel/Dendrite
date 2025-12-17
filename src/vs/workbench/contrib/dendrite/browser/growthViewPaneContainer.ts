/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { DENDRITE_VIEW_CONTAINER_ID } from '../common/constants.js';

export class GrowthViewPaneContainer extends ViewPaneContainer {
    constructor(
        @IInstantiationService instantiationService: IInstantiationService,
        @IConfigurationService configurationService: IConfigurationService,
        @IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
        @IContextMenuService contextMenuService: IContextMenuService,
        @ITelemetryService telemetryService: ITelemetryService,
        @IExtensionService extensionService: IExtensionService,
        @IThemeService themeService: IThemeService,
        @IStorageService storageService: IStorageService,
        @IWorkspaceContextService contextService: IWorkspaceContextService,
        @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
        @ILogService logService: ILogService,
    ) {
        super(
            DENDRITE_VIEW_CONTAINER_ID,
            { mergeViewWithContainerWhenSingleView: true },
            instantiationService,
            configurationService,
            layoutService,
            contextMenuService,
            telemetryService,
            extensionService,
            themeService,
            storageService,
            contextService,
            viewDescriptorService,
            logService
        );
    }
}
