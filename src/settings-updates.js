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
        if (this.isPackaged) return;
        if (this.isCheckingUpdate) return;
        this.isCheckingUpdate = true;
        if (manual) {
            this.updateStatusText = 'Checking GitHub Releases…';
        }
        try {
            const res = await fetch('https://api.github.com/repos/tbkmax/TopClock/releases/latest', {
                headers: { 'Accept': 'application/vnd.github.v3+json' },
            });
            if (!res.ok) {
                if (res.status === 404) {
                    this.updateAvailable = false;
                    this.updateStatusText = `TopClock v${this.appVersion} is up to date`;
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
                this.updateStatusText = `New version ${latestTag} is available!`;
            } else {
                this.updateAvailable = false;
                this.updateStatusText = `TopClock v${this.appVersion} is up to date`;
            }
        } catch (error) {
            console.warn('Update check failed:', error);
            if (manual) {
                this.updateStatusText = `Could not reach GitHub Releases (v${this.appVersion})`;
            }
        } finally {
            this.isCheckingUpdate = false;
        }
    },

    openRelease() {
        if (this.isPackaged) return;
        invoke('open_release_page', { url: this.latestReleaseUrl }).catch(console.error);
    },

};
