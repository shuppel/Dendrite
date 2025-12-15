
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { DendriteSessionLifecycleService } from './sessionLifecycleService.js';
import * as DOM from '../../../../base/browser/dom.js';

export class DendriteDashboardView extends ViewPane {
    private _container: HTMLElement | undefined;

    constructor(
        options: IViewletViewOptions,
        @IKeybindingService keybindingService: IKeybindingService,
        @IContextMenuService contextMenuService: IContextMenuService,
        @IConfigurationService configurationService: IConfigurationService,
        @IContextKeyService contextKeyService: IContextKeyService,
        @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
        @IInstantiationService instantiationService: IInstantiationService,
        @IOpenerService openerService: IOpenerService,
        @IThemeService themeService: IThemeService,
        @ITelemetryService telemetryService: ITelemetryService,
        @IHoverService hoverService: IHoverService,
        @IInstantiationService private readonly _instantiationService: IInstantiationService,
    ) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService, hoverService);
    }

    protected override renderBody(container: HTMLElement): void {
        super.renderBody(container);
        this._container = container;
        this._container.classList.add('dendrite-dashboard');
        
        const title = DOM.append(container, DOM.$('h2'));
        title.textContent = 'Dendrite Growth Dashboard';
        
        const status = DOM.append(container, DOM.$('div.status'));
        status.textContent = 'Initializing...';

        // Get the lifecycle service
        const lifecycleService = this._instantiationService.createInstance(DendriteSessionLifecycleService);
        
        // Listen to updates
        this._register(lifecycleService.onDidChangeSessionState(state => {
            status.textContent = `Current Session State: ${state}`;
        }));
        
        status.textContent = `Current Session State: ${lifecycleService.state}`;
    }

    protected override layoutBody(height: number, width: number): void {
        super.layoutBody(height, width);
        // Resize logic
    }
}
