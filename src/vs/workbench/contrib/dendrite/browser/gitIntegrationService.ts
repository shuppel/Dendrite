/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Thoughtful App Company / Erikk Shupp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { SessionHandle } from '../common/types.js';
import { WasmBridge } from './wasmBridge.js';
import { URI } from '../../../../base/common/uri.js';

export class DendriteGitIntegrationService extends Disposable {
    private _gitHeadWatcher: IDisposable | undefined;

    constructor(
        @IFileService private readonly fileService: IFileService,
        @IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
    ) {
        super();
    }

    public startTracking(handle: SessionHandle) {
        const workspace = this.workspaceContextService.getWorkspace();
        if (workspace.folders.length === 0) return;

        const rootUri = workspace.folders[0].uri;
        const gitHeadUri = URI.joinPath(rootUri, '.git/HEAD');

        // Watch .git/HEAD for changes (simple commit detection)
        this._gitHeadWatcher = this.fileService.watch(gitHeadUri);
        this._register(this._gitHeadWatcher);
        this._register(this.fileService.onDidFilesChange(e => {
            if (e.contains(gitHeadUri)) {
                this.onCommitDetected(handle);
            }
        }));
    }

    private async onCommitDetected(handle: SessionHandle) {
        // In a real implementation, we would parse the commit log here.
        // For this prototype, we record a placeholder commit to prove the pipeline works.
        const mockCommit = {
            hash: "latest-commit",
            short_hash: "latest",
            message: "Commit detected during session",
            timestamp: new Date().toISOString(),
            files_changed: []
        };
        
        WasmBridge.instance.addCommitToSession(handle, mockCommit);
    }
}
