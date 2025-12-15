
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry, IWorkbenchContribution } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IViewContainersRegistry, Extensions as ViewExtensions, ViewContainerLocation, IViewsRegistry } from '../../../common/views.js';
import { GrowthViewPaneContainer } from './growthViewPaneContainer.js';
import { DendriteDashboardView } from './dashboardView.js';
import { DendriteSessionLifecycleService } from './sessionLifecycleService.js';
import { DENDRITE_VIEW_CONTAINER_ID, DENDRITE_DASHBOARD_VIEW_ID, ConfigKeys, CommandIds } from '../common/constants.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';

// 1. Service Instantiation Contribution
export class DendriteContribution extends Disposable implements IWorkbenchContribution {
    private lifecycleService: DendriteSessionLifecycleService;

    constructor(
        @IInstantiationService private readonly instantiationService: IInstantiationService
    ) {
        super();
        // Eagerly create the lifecycle service to start tracking
        this.lifecycleService = this.instantiationService.createInstance(DendriteSessionLifecycleService);
        this.registerCommands();
    }

    private registerCommands() {
        CommandsRegistry.registerCommand(CommandIds.PAUSE_SESSION, () => this.lifecycleService.pauseSession());
        CommandsRegistry.registerCommand(CommandIds.RESUME_SESSION, () => this.lifecycleService.resumeSession());
        CommandsRegistry.registerCommand(CommandIds.SHOW_STATS, () => {
             // Placeholder for notification logic
             console.log('Dendrite stats requested'); 
        });
        
        // Export and badge commands would go here (delegating to other services or implemented inline)
        CommandsRegistry.registerCommand(CommandIds.EXPORT_PORTFOLIO, () => { console.log('Export triggered'); });
        CommandsRegistry.registerCommand(CommandIds.COPY_BADGE, () => { console.log('Copy badge triggered'); });
    }
}

// Register Workbench Contribution
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(DendriteContribution, LifecyclePhase.Restored);

// 2. View Container Registration
const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainers);
const growthViewContainer = viewContainerRegistry.registerViewContainer({
    id: DENDRITE_VIEW_CONTAINER_ID,
    title: { value: localize('dendrite.growth', "Growth"), original: 'Growth' },
    icon: Codicon.pulse,
    ctl: GrowthViewPaneContainer,
    storageId: DENDRITE_VIEW_CONTAINER_ID,
    hideIfEmpty: false
}, ViewContainerLocation.Sidebar);

// 3. View Registration
const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.Views);
viewsRegistry.registerViews([{
    id: DENDRITE_DASHBOARD_VIEW_ID,
    name: { value: localize('dendrite.dashboard', "Dashboard"), original: 'Dashboard' },
    containerIcon: Codicon.pulse,
    canToggleVisibility: true,
    canMoveView: true,
    ctorDescriptor: new SyncDescriptor(DendriteDashboardView)
}], growthViewContainer);

// 4. Configuration Registration
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'dendrite',
    order: 100,
    title: localize('dendrite', "Dendrite"),
    type: 'object',
    properties: {
        [ConfigKeys.ENABLED]: {
            type: 'boolean',
            default: true,
            description: localize('dendrite.enabled', "Enable Dendrite session tracking")
        },
        [ConfigKeys.IDLE_THRESHOLD]: {
            type: 'number',
            default: 300000,
            description: localize('dendrite.idleThreshold', "Milliseconds of inactivity before marking idle")
        },
        [ConfigKeys.AUTO_START]: {
            type: 'boolean',
            default: true,
            description: localize('dendrite.autoStart', "Automatically start session on editor focus")
        },
        [ConfigKeys.TRACK_GIT]: {
            type: 'boolean',
            default: true,
            description: localize('dendrite.trackGit', "Correlate sessions with git commits")
        },
        [ConfigKeys.HEATMAP_WEEKS]: {
            type: 'number',
            default: 12,
            description: localize('dendrite.heatmapWeeks', "Number of weeks to show in heatmap")
        },
        [ConfigKeys.SHOW_STREAK_NOTIFICATION]: {
            type: 'boolean',
            default: true,
            description: localize('dendrite.showStreakNotification', "Show notification when streak increases")
        }
    }
});
