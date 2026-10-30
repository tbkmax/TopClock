import { invoke } from '@tauri-apps/api/core';

export function isNewerVersion(latest, current) {
    const cleanL = String(latest).replace(/^v/, '').split('.').map(Number);
    const cleanC = String(current).replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(cleanL.length, cleanC.length); i++) {
        const l = cleanL[i] || 0;
        const c = cleanC[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

export const updateMethods = {
    async checkForUpdates(manual = false) {
        if (this.isCheckingUpdate || this.isInstallingUpdate) return;
        this.isCheckingUpdate = true;
        if (this.isPackaged) {
            this.setUpdateStatus('updates.checkingStore');
            try {
                this.updateAvailable = await invoke('check_store_updates');
                this.setUpdateStatus(this.updateAvailable ? 'updates.storeAvailable' : 'updates.upToDate', { version: this.appVersion });
            } catch (error) {
                console.warn('Store update check failed:', error);
                this.setUpdateStatus('updates.storeCheckFailed');
            } finally {
                this.isCheckingUpdate = false;
            }
            return;
        }
        if (manual) {
            this.setUpdateStatus('updates.checkingGithub');
        }
        try {
            const res = await fetch('https://api.github.com/repos/tbkmax/TopClock/releases/latest', {
                headers: { 'Accept': 'application/vnd.github.v3+json' },
            });
            if (!res.ok) {
                if (res.status === 404) {
                    this.updateAvailable = false;
                    this.setUpdateStatus('updates.upToDate', { version: this.appVersion });
                    return;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const latestTag = data.tag_name || '';
            const cleanLatest = latestTag.replace(/^v/, '');
            this.latestReleaseUrl = data.html_url || 'https://github.com/tbkmax/TopClock/releases/latest';
            this.latestReleaseTag = latestTag;

            if (isNewerVersion(cleanLatest, this.appVersion)) {
                this.updateAvailable = true;
                this.setUpdateStatus('updates.available', { version: latestTag });
            } else {
                this.updateAvailable = false;
                this.setUpdateStatus('updates.upToDate', { version: this.appVersion });
            }
        } catch (error) {
            console.warn('Update check failed:', error);
            if (manual) {
                this.setUpdateStatus('updates.unreachable', { version: this.appVersion });
            }
        } finally {
            this.isCheckingUpdate = false;
        }
    },

    openRelease() {
        if (this.isPackaged) return;
        invoke('open_release_page', { url: this.latestReleaseUrl }).catch(console.error);
    },

    async installStoreUpdate() {
        if (!this.isPackaged || !this.updateAvailable || this.isInstallingUpdate) return;
        this.isInstallingUpdate = true;
        this.setUpdateStatus('updates.storeInstalling');
        try {
            const outcome = await invoke('install_store_update');
            if (outcome === 'completed' || outcome === 'up_to_date') {
                this.updateAvailable = false;
                this.setUpdateStatus(outcome === 'completed' ? 'updates.storeInstalled' : 'updates.upToDate', { version: this.appVersion });
            } else {
                this.setUpdateStatus('updates.storeCanceled');
            }
        } catch (error) {
            console.warn('Store update failed:', error);
            this.setUpdateStatus('updates.storeInstallFailed');
        } finally {
            this.isInstallingUpdate = false;
        }
    },

};
