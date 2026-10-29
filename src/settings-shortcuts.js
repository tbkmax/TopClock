export const DEFAULT_SHORTCUTS = {
    interaction_modifier: 'Ctrl',
    open_settings: 'Ctrl+,',
    open_settings_enabled: false,
    quit: 'Ctrl+Alt+Q',
    quit_enabled: false,
    timer_toggle: 'Ctrl+Shift+S',
    timer_toggle_enabled: false,
    timer_reset: 'Ctrl+Shift+R',
    timer_reset_enabled: false,
};

export function supportedGlobalKey(key) {
    return /^[A-Z0-9]$/.test(key)
        || /^F(?:[1-9]|1\d|2[0-4])$/.test(key)
        || [',', '.', '/', ';', "'", '[', ']', '\\', '-', '=', '`', 'Space', 'Enter', 'Tab',
            'Escape', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key);
}

export const shortcutGroups = [
    {
        id: 'core', title: 'TOPCLOCK DEFAULT SHORTCUTS',
        description: 'Core interactions for operating the desktop clock',
        actions: [
            { key: 'open_settings', label: 'Open Settings', description: 'Show settings window while clock is active', switchLabel: 'Enable Open Settings shortcut' },
            { key: 'quit', label: 'Quit TopClock', description: 'Exit application completely', switchLabel: 'Enable Quit shortcut' },
        ],
    },
    {
        id: 'addons', title: 'ADD-ON SHORTCUTS',
        description: 'Dedicated shortcuts for add-ons. Only changeable when the respective add-on is enabled.',
        actions: [
            { key: 'timer_toggle', label: 'Timer Start / Stop', description: 'Start or pause the timer', switchLabel: 'Enable Timer Start or Pause shortcut', requiresTimer: true },
            { key: 'timer_reset', label: 'Timer Reset', description: 'Reset the timer back to zero', switchLabel: 'Enable Timer Reset shortcut', requiresTimer: true },
        ],
    },
];

export function shortcutConflict(shortcuts, timerEnabled, actionKey) {
    if (!shortcuts) return null;
    if (!timerEnabled && actionKey.startsWith('timer_')) return null;
    if (!shortcuts[`${actionKey}_enabled`]) return null;
    const current = (shortcuts[actionKey] || '').trim().toLowerCase();
    if (!current) return null;
    const labels = {
        open_settings: 'Open Settings',
        quit: 'Quit TopClock',
        ...(timerEnabled ? { timer_toggle: 'Timer Start / Stop', timer_reset: 'Timer Reset' } : {}),
    };
    for (const [key, label] of Object.entries(labels)) {
        if (key === actionKey || !shortcuts[`${key}_enabled`]) continue;
        const other = (shortcuts[key] || '').trim().toLowerCase();
        if (other && other === current) return label;
    }
    return null;
}

export const shortcutMethods = {
    startRecording(actionKey) {
        if (this.settings.shortcuts[`${actionKey}_enabled`]) {
            this.error = 'Turn off this shortcut before changing its keys.';
            return;
        }
        if (this.recordingAction) {
            this.stopRecording();
        }
        this.recordingAction = actionKey;
        this.recordListener = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === 'Escape') {
                this.stopRecording();
                return;
            }
            if (event.key === 'Backspace' || event.key === 'Delete') {
                this.clearShortcut(actionKey);
                this.stopRecording();
                return;
            }
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
                return;
            }
            const mods = [];
            if (event.ctrlKey) mods.push('Ctrl');
            if (event.altKey) mods.push('Alt');
            if (event.shiftKey) mods.push('Shift');

            let key = event.key;
            if (key === ' ') key = 'Space';
            else if (key.length === 1) key = key.toUpperCase();

            if (!(event.ctrlKey || event.altKey || event.shiftKey) || !supportedGlobalKey(key)) {
                this.error = 'Choose Ctrl, Alt, or Shift plus a supported key for a system-wide shortcut.';
                return;
            }

            const combo = [...mods, key].join('+');
            if (!this.settings.shortcuts) {
                this.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
            }
            this.settings.shortcuts[actionKey] = combo;
            this.error = '';
            this.save();
            this.stopRecording();
        };
        window.addEventListener('keydown', this.recordListener, { capture: true });
    },

    stopRecording() {
        if (this.recordListener) {
            window.removeEventListener('keydown', this.recordListener, { capture: true });
            this.recordListener = null;
        }
        this.recordingAction = null;
    },

    clearShortcut(actionKey) {
        if (!this.settings.shortcuts) {
            this.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
        }
        this.settings.shortcuts[actionKey] = '';
        this.settings.shortcuts[`${actionKey}_enabled`] = false;
        this.save();
    },

    toggleShortcut(actionKey) {
        if (!this.settings.shortcuts[actionKey]) return;
        const key = `${actionKey}_enabled`;
        this.settings.shortcuts[key] = !this.settings.shortcuts[key];
        this.save();
    },

    resetAllShortcuts() {
        this.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
        this.save();
    },

    getConflict(actionKey) {
        return shortcutConflict(this.settings?.shortcuts, this.timerAddonEnabled, actionKey);
    },

    formatShortcutKeys(binding) {
        if (!binding || !binding.trim()) return ['None'];
        return binding.split('+').map((k) => k.trim());
    },

};
