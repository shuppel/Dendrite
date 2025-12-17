/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { SessionStats, LifetimeStats, HeatmapData, LanguageStat, SessionHandle } from '../common/types.js';

// Raw WASM exports (strings for complex types)
interface IRawWasmExports {
    init_session: () => SessionHandle;
    record_keystroke: (handle: SessionHandle) => void;
    record_file_edit: (handle: SessionHandle, file_path: string, language: string) => void;
    mark_idle: (handle: SessionHandle) => void;
    resume_from_idle: (handle: SessionHandle) => void;
    end_session: (handle: SessionHandle) => string; // JSON
    get_active_session_stats: (handle: SessionHandle) => string; // JSON
    serialize_session: (handle: SessionHandle) => string; // JSON
    save_session_to_profile: (profile_json: string, session_json: string) => string; // JSON
    create_empty_profile: () => string; // JSON
    get_profile_stats: (profile_json: string) => string; // JSON
    get_current_streak: (profile_json: string) => number;
    get_longest_streak: (profile_json: string) => number;
    add_commit_to_session: (handle: SessionHandle, commit_json: string) => void;
    get_commit_correlations: (profile_json: string) => string; // JSON
    generate_heatmap: (profile_json: string, weeks: number) => string; // JSON
    generate_hourly_distribution: (profile_json: string) => string; // JSON
    generate_language_breakdown: (profile_json: string) => string; // JSON
    get_daily_aggregates: (profile_json: string, days: number) => string; // JSON
    export_json: (profile_json: string, options_json: string) => string;
    export_markdown: (profile_json: string, options_json: string) => string;
    export_heatmap_svg: (profile_json: string, weeks: number) => string;
    generate_badge_svg: (profile_json: string) => string;
    generate_badge_url: (profile_json: string) => string;
}

export class WasmBridge {
    private static _instance: WasmBridge | undefined;
    private _wasm: IRawWasmExports | undefined;
    private _initialized: boolean = false;

    private constructor() {}

    public static get instance(): WasmBridge {
        if (!WasmBridge._instance) {
            WasmBridge._instance = new WasmBridge();
        }
        return WasmBridge._instance;
    }

    public async initialize(): Promise<void> {
        if (this._initialized) return;

        try {
            // Import from the 'wasm' directory where build script outputs
            const wasm = await import('./wasm/dendrite_core.js');
            await wasm.default();
            this._wasm = wasm as unknown as IRawWasmExports;
            this._initialized = true;
            console.log('Dendrite WASM initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Dendrite WASM:', error);
            throw error;
        }
    }

    private get raw(): IRawWasmExports {
        if (!this._initialized || !this._wasm) {
            throw new Error('Dendrite WASM not initialized');
        }
        return this._wasm;
    }

    // Wrapped Public API
    public initSession(): SessionHandle { return this.raw.init_session(); }
    public recordKeystroke(handle: SessionHandle): void { this.raw.record_keystroke(handle); }
    public recordFileEdit(handle: SessionHandle, path: string, lang: string): void { this.raw.record_file_edit(handle, path, lang); }
    public markIdle(handle: SessionHandle): void { this.raw.mark_idle(handle); }
    public resumeFromIdle(handle: SessionHandle): void { this.raw.resume_from_idle(handle); }
    
    public endSession(handle: SessionHandle): SessionStats {
        return JSON.parse(this.raw.end_session(handle));
    }
    
    public getActiveSessionStats(handle: SessionHandle): SessionStats {
        return JSON.parse(this.raw.get_active_session_stats(handle));
    }

    public serializeSession(handle: SessionHandle): string { return this.raw.serialize_session(handle); }
    
    public saveSessionToProfile(profile: string, session: string): string {
        return this.raw.save_session_to_profile(profile, session);
    }

    public createEmptyProfile(): string { return this.raw.create_empty_profile(); }
    
    public getProfileStats(profile: string): LifetimeStats {
        return JSON.parse(this.raw.get_profile_stats(profile));
    }

    public getCurrentStreak(profile: string): number { return this.raw.get_current_streak(profile); }
    public getLongestStreak(profile: string): number { return this.raw.get_longest_streak(profile); }

    public addCommitToSession(handle: SessionHandle, commit: any): void {
        this.raw.add_commit_to_session(handle, JSON.stringify(commit));
    }

    public getCommitCorrelations(profile: string): any[] {
        return JSON.parse(this.raw.get_commit_correlations(profile));
    }

    public generateHeatmap(profile: string, weeks: number): HeatmapData {
        return JSON.parse(this.raw.generate_heatmap(profile, weeks));
    }

    public generateHourlyDistribution(profile: string): any {
        return JSON.parse(this.raw.generate_hourly_distribution(profile));
    }

    public generateLanguageBreakdown(profile: string): LanguageStat[] {
        return JSON.parse(this.raw.generate_language_breakdown(profile));
    }

    // Exports returns raw strings usually
    public exportJson(profile: string, options: string): string { return this.raw.export_json(profile, options); }
    public exportMarkdown(profile: string, options: string): string { return this.raw.export_markdown(profile, options); }
    public exportHeatmapSvg(profile: string, weeks: number): string { return this.raw.export_heatmap_svg(profile, weeks); }
    public generateBadgeSvg(profile: string): string { return this.raw.generate_badge_svg(profile); }
    public generateBadgeUrl(profile: string): string { return this.raw.generate_badge_url(profile); }
}
