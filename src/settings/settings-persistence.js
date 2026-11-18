export function cloneSettings(settings) {
    return JSON.parse(JSON.stringify(settings));
}

function canonicalSettings(value) {
    if (Array.isArray(value)) return value.map(canonicalSettings);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalSettings(value[key])]));
    }
    return value;
}

function sameSettings(left, right) {
    return JSON.stringify(canonicalSettings(left)) === JSON.stringify(canonicalSettings(right));
}

// Keep previews immediate while serializing writes to the single native settings file.
export function createSettingsPersistence({ write, preview, recover = async (settings) => settings, onCommit, onRollback, onError, delay = 80 }) {
    let committed = null;
    let revision = 0;
    let pending = null;
    let timer = null;
    let writes = 0;
    let queue = Promise.resolve(true);

    function enqueue(change) {
        writes++;
        queue = queue.then(async () => {
            try {
                const saved = await write(change.settings);
                committed = cloneSettings(saved ?? change.settings);
                if (change.revision === revision) onCommit(committed);
                return true;
            } catch (error) {
                if (change.revision === revision) {
                    let restored = cloneSettings(committed);
                    try {
                        restored = cloneSettings(await recover(restored));
                    } catch (recoveryError) {
                        console.error('Could not read back saved settings:', recoveryError);
                    }
                    if (change.revision !== revision) return false;
                    committed = cloneSettings(restored);
                    // Rust can persist successfully, then report an event-emission error.
                    if (sameSettings(restored, change.settings)) {
                        onCommit(restored);
                        return true;
                    }
                    try {
                        await onRollback(restored, () => change.revision === revision);
                    } catch (rollbackError) {
                        console.error('Could not restore Settings view:', rollbackError);
                    }
                    if (change.revision !== revision) return false;
                    try {
                        await preview(restored);
                    } catch (previewError) {
                        console.error('Could not restore clock preview:', previewError);
                    }
                    if (change.revision === revision) onError(error);
                }
                return false;
            } finally {
                writes--;
            }
        });
        return queue;
    }

    return {
        setCommitted(settings) {
            committed = cloneSettings(settings);
        },
        hasPending() {
            return timer !== null || writes > 0;
        },
        schedule(settings) {
            revision++;
            const change = { settings: cloneSettings(settings), revision };
            void Promise.resolve().then(() => preview(change.settings)).catch(console.error);
            clearTimeout(timer);
            pending = change;
            timer = setTimeout(() => {
                timer = null;
                enqueue(pending);
                pending = null;
            }, delay);
        },
        async flush() {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
                enqueue(pending);
                pending = null;
            }
            return queue;
        },
    };
}
