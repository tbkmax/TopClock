import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Preserve the public Tauri command and event contract; this mapping is bundled code.
export const nativeAddonAdapter = {
    getTimer: () => invoke('get_timer_state'),
    getProgress: () => invoke('get_progress_timer_states'),
    onTimer: (callback) => listen('timer-state-changed', ({ payload }) => callback(payload)),
    onProgress: (callback) => listen('progress-timer-states-changed', ({ payload }) => callback(payload)),
    action(addon, action) {
        if (addon.kind === 'timer') return invoke('timer_action', { action });
        if (addon.kind === 'progress') return invoke('progress_timer_action', { id: addon.id, action });
        return Promise.reject(new Error('Add-on has no native actions'));
    },
};
