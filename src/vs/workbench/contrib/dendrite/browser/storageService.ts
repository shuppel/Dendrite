
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { StorageKeys } from '../common/constants.js';
import { WasmBridge } from './wasmBridge.js';
import { SessionHandle } from '../common/types.js';

export class DendriteStorageService extends Disposable {
    constructor(
        private readonly storageService: IStorageService
    ) {
        super();
    }

    public getProfileJson(): string {
        const profile = this.storageService.get(StorageKeys.PROFILE, StorageScope.PROFILE);
        if (!profile) {
            // Initialize empty profile if missing
            const empty = WasmBridge.instance.createEmptyProfile();
            this.saveProfileJson(empty);
            return empty;
        }
        return profile;
    }

    public saveProfileJson(json: string): void {
        this.storageService.store(
            StorageKeys.PROFILE,
            json,
            StorageScope.PROFILE,
            StorageTarget.USER
        );
    }

    public getActiveSessionHandle(): SessionHandle | undefined {
        const handleStr = this.storageService.get(StorageKeys.ACTIVE_SESSION, StorageScope.WORKSPACE);
        return handleStr ? parseInt(handleStr, 10) : undefined;
    }

    public saveActiveSessionHandle(handle: SessionHandle | undefined): void {
        if (handle === undefined) {
            this.storageService.remove(StorageKeys.ACTIVE_SESSION, StorageScope.WORKSPACE);
        } else {
            this.storageService.store(
                StorageKeys.ACTIVE_SESSION,
                handle.toString(),
                StorageScope.WORKSPACE,
                StorageTarget.MACHINE
            );
        }
    }
}
