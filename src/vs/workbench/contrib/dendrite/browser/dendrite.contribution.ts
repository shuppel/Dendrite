
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
import { DENDRITE_VIEW_CONTAINER_ID, DENDRITE_DASHBOARD_VIEW_ID, ConfigKeys } from '../common/constants.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerAllCommands, setSessionCommandContext } from './commands/index.js';

// 1. Service Instantiation Contribution
export class DendriteContribution extends Disposable implements IWorkbenchContribution {
    private lifecycleService: DendriteSessionLifecycleService;

    constructor(
        @IInstantiationService private readonly instantiationService: IInstantiationService
    ) {
        super();
        // Eagerly create the lifecycle service to start tracking
        this.lifecycleService = this.instantiationService.createInstance(DendriteSessionLifecycleService);
        
        // Set up command context and register all commands
        setSessionCommandContext({ lifecycleService: this.lifecycleService });
        registerAllCommands();
    }
}

// Register Workbench Contribution
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(DendriteContribution, LifecyclePhase.Restored);

// 2. View Container Registration
const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry);
const growthViewContainer = viewContainerRegistry.registerViewContainer({
    id: DENDRITE_VIEW_CONTAINER_ID,
    title: { value: localize('dendrite.growth', "Growth"), original: 'Growth' },
    icon: Codicon.pulse,
    ctorDescriptor: new SyncDescriptor(GrowthViewPaneContainer),
    storageId: DENDRITE_VIEW_CONTAINER_ID,
    hideIfEmpty: false
}, ViewContainerLocation.Sidebar);

// 3. View Registration
const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
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
        },

        // Terminal Velocity Settings (Era 4)
        [ConfigKeys.TERMINAL_SMOOTH_CURSOR]: {
            type: 'boolean',
            default: true,
            description: localize('dendrite.terminal.smoothCursor', "Enable smooth cursor interpolation in terminal (Hyprland-style)")
        },
        [ConfigKeys.TERMINAL_CURSOR_PHYSICS]: {
            type: 'object',
            default: {
                duration: 80,
                easing: 'ease-out'
            },
            description: localize('dendrite.terminal.cursorPhysics', "Cursor interpolation physics configuration"),
            properties: {
                duration: {
                    type: 'number',
                    default: 80,
                    minimum: 20,
                    maximum: 200,
                    description: localize('dendrite.terminal.cursorPhysics.duration', "Interpolation duration in milliseconds (20-200)")
                },
                easing: {
                    type: 'string',
                    default: 'ease-out',
                    enum: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'],
                    enumDescriptions: [
                        localize('dendrite.terminal.cursorPhysics.easing.linear', "Constant interpolation speed"),
                        localize('dendrite.terminal.cursorPhysics.easing.ease', "Standard easing curve"),
                        localize('dendrite.terminal.cursorPhysics.easing.easeIn', "Slow start, fast finish"),
                        localize('dendrite.terminal.cursorPhysics.easing.easeOut', "Fast start, slow finish (recommended)"),
                        localize('dendrite.terminal.cursorPhysics.easing.easeInOut', "Smooth acceleration and deceleration")
                    ],
                    description: localize('dendrite.terminal.cursorPhysics.easing', "CSS easing function for cursor animation")
                }
            }
        },
        [ConfigKeys.TERMINAL_FORCE_GPU]: {
            type: 'boolean',
            default: true,
            description: localize('dendrite.terminal.forceGPU', "Force WebGL renderer for terminal (GPU acceleration)")
        },
        [ConfigKeys.TERMINAL_TARGET_FPS]: {
            type: 'number',
            default: 60,
            minimum: 30,
            maximum: 120,
            description: localize('dendrite.terminal.targetFPS', "Target frame rate for cursor animation (30-120)")
        }
    }
});
