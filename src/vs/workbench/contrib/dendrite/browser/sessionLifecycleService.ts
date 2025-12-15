
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { DendriteStorageService } from './storageService.js';
import { DendriteGitIntegrationService } from './gitIntegrationService.js';
import { WasmBridge } from './wasmBridge.js';
import { ConfigKeys } from '../common/constants.js';
import { SessionState } from '../common/types.js';
import { Emitter, Event } from '../../../../base/common/event.js';

export class DendriteSessionLifecycleService extends Disposable {
    private _state: SessionState = SessionState.ENDED;
    private _lastActivityTime: number = Date.now();
    private _checkIdleInterval: any;
    private _handle: number | undefined;
    
    private readonly storageService: DendriteStorageService;
    private readonly gitService: DendriteGitIntegrationService;

    private readonly _onDidChangeSessionState = this._register(new Emitter<SessionState>());
    public readonly onDidChangeSessionState: Event<SessionState> = this._onDidChangeSessionState.event;

    constructor(
        @IConfigurationService private readonly configurationService: IConfigurationService,
        @ILifecycleService private readonly lifecycleService: ILifecycleService,
        @ICodeEditorService private readonly codeEditorService: ICodeEditorService,
        @IStorageService storageService: IStorageService,
        @IFileService fileService: IFileService,
        @IWorkspaceContextService workspaceContextService: IWorkspaceContextService
    ) {
        super();
        this.storageService = new DendriteStorageService(storageService);
        this.gitService = new DendriteGitIntegrationService(fileService, workspaceContextService);
        this.initialize();
    }

    private async initialize() {
        await WasmBridge.instance.initialize();
        
        // Restore active session if any
        const savedHandle = this.storageService.getActiveSessionHandle();
        if (savedHandle !== undefined) {
            this._handle = savedHandle;
            this._state = SessionState.ACTIVE; 
            this._onDidChangeSessionState.fire(this._state);
            this.startIdleCheck();
            this.gitService.startTracking(this._handle);
        }

        this.registerListeners();
    }

    private registerListeners() {
        this._register(this.codeEditorService.onCodeEditorAdd(this.onEditorAdd, this));
        this._register(this.lifecycleService.onDidShutdown(() => this.onShutdown()));
        
        const editors = this.codeEditorService.listCodeEditors();
        editors.forEach(editor => this.onEditorAdd(editor));
    }

    private onEditorAdd(editor: ICodeEditor) {
        const disposable = new DisposableStore();
        
        disposable.add(editor.onKeyDown(() => this.onActivity('keystroke')));
        disposable.add(editor.onDidChangeModelContent((e) => {
            const model = editor.getModel();
            if (model) {
                this.onActivity('edit', model.uri.fsPath, model.getLanguageId());
            }
        }));
    }

    private onActivity(type: 'keystroke' | 'edit', filePath?: string, language?: string) {
        this._lastActivityTime = Date.now();

        if (this._state === SessionState.IDLE) {
            this.resumeFromIdle();
        } else if (this._state === SessionState.ENDED || this._state === SessionState.PAUSED) {
            const autoStart = this.configurationService.getValue<boolean>(ConfigKeys.AUTO_START);
            if (autoStart && this._state === SessionState.ENDED) {
                this.startSession();
            }
        }

        if (this._state === SessionState.ACTIVE && this._handle !== undefined) {
            const wasm = WasmBridge.instance;
            if (type === 'keystroke') {
                wasm.recordKeystroke(this._handle);
            } else if (type === 'edit' && filePath && language) {
                wasm.recordFileEdit(this._handle, filePath, language);
            }
        }
    }

    public startSession() {
        if (this._state === SessionState.ACTIVE) return;

        const wasm = WasmBridge.instance;
        this._handle = wasm.initSession();
        this._state = SessionState.ACTIVE;
        this.storageService.saveActiveSessionHandle(this._handle);
        this._onDidChangeSessionState.fire(this._state);
        
        this.gitService.startTracking(this._handle);
        this.startIdleCheck();
    }

    public pauseSession() {
        if (this._state !== SessionState.ACTIVE) return;
        this._state = SessionState.PAUSED;
        this._onDidChangeSessionState.fire(this._state);
    }

    public resumeSession() {
        if (this._state === SessionState.PAUSED) {
            this._state = SessionState.ACTIVE;
            this._onDidChangeSessionState.fire(this._state);
        }
    }

    public endSession() {
        if (this._handle === undefined) return;

        const wasm = WasmBridge.instance;
        const sessionStats = wasm.endSession(this._handle);
        
        const sessionJson = wasm.serializeSession(this._handle);
        let profileJson = this.storageService.getProfileJson();
        profileJson = wasm.saveSessionToProfile(profileJson, sessionJson);
        this.storageService.saveProfileJson(profileJson);

        this._handle = undefined;
        this._state = SessionState.ENDED;
        this.storageService.saveActiveSessionHandle(undefined);
        this._onDidChangeSessionState.fire(this._state);
        
        this.stopIdleCheck();
    }

    private startIdleCheck() {
        if (this._checkIdleInterval) clearInterval(this._checkIdleInterval);
        this._checkIdleInterval = setInterval(() => {
            this.checkIdle();
        }, 10000); 
    }

    private stopIdleCheck() {
        if (this._checkIdleInterval) {
            clearInterval(this._checkIdleInterval);
            this._checkIdleInterval = undefined;
        }
    }

    private checkIdle() {
        if (this._state !== SessionState.ACTIVE || this._handle === undefined) return;

        const threshold = this.configurationService.getValue<number>(ConfigKeys.IDLE_THRESHOLD) || 300000;
        const idleTime = Date.now() - this._lastActivityTime;

        if (idleTime > threshold) {
            WasmBridge.instance.markIdle(this._handle);
            this._state = SessionState.IDLE;
            this._onDidChangeSessionState.fire(this._state);
        }
    }

    private resumeFromIdle() {
        if (this._state === SessionState.IDLE && this._handle !== undefined) {
            WasmBridge.instance.resumeFromIdle(this._handle);
            this._state = SessionState.ACTIVE;
            this._onDidChangeSessionState.fire(this._state);
        }
    }

    private onShutdown() {
        if (this._state === SessionState.ACTIVE) {
            this.endSession();
        }
    }

    public get state(): SessionState {
        return this._state;
    }
}
