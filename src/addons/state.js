import { nativeAddonAdapter } from './native-adapter.js';

export function createAddonState({ adapter = nativeAddonAdapter, onChange = () => {}, reactive } = {}) {
    if (typeof reactive !== 'function') throw new Error('Add-on state requires a reactive store');
    const snapshot = reactive({ timerSession: null, progressTimerSessions: {}, counterSession: null });
    let timerRevision = 0;
    let progressRevision = 0;
    let counterRevision = 0;
    let started = false;
    let disposed = false;
    let unlisten = [];
    const notify = () => onChange(snapshot);
    const setTimer = (value) => { snapshot.timerSession = value; timerRevision++; notify(); };
    const setProgress = (value) => { snapshot.progressTimerSessions = value; progressRevision++; notify(); };
    const setCounter = (value) => { snapshot.counterSession = value; counterRevision++; notify(); };
    return {
        get snapshot() { return snapshot; },
        setTimer,
        setProgress,
        setCounter,
        async start() {
            if (started) return;
            started = true;
            try {
                unlisten.push(await adapter.onTimer((value) => { if (!disposed) setTimer(value); }));
                unlisten.push(await adapter.onProgress((value) => { if (!disposed) setProgress(value); }));
                unlisten.push(await adapter.onCounter((value) => { if (!disposed) setCounter(value); }));
                if (disposed) { unlisten.forEach((stop) => stop()); return; }
                const timerBefore = timerRevision;
                const progressBefore = progressRevision;
                const counterBefore = counterRevision;
                const [timer, progress, counter] = await Promise.all([adapter.getTimer(), adapter.getProgress(), adapter.getCounter()]);
                if (disposed) return;
                if (timerRevision === timerBefore) setTimer(timer);
                if (progressRevision === progressBefore) setProgress(progress);
                if (counterRevision === counterBefore) setCounter(counter);
            } catch (error) {
                unlisten.forEach((stop) => stop());
                unlisten = [];
                started = false;
                throw error;
            }
        },
        async dispatch(addon, action, options = {}) {
            const revision = addon.kind === 'timer' ? timerRevision
                : addon.kind === 'counter' ? counterRevision : progressRevision;
            const session = await adapter.action(addon, action, Boolean(options.confirmedReset));
            if (disposed) return session;
            // A broadcast received while the command was pending is at least as fresh
            // as its returned snapshot, so do not overwrite it.
            if (addon.kind === 'timer' && timerRevision === revision) setTimer(session);
            if (addon.kind === 'progress' && progressRevision === revision) {
                setProgress({ ...snapshot.progressTimerSessions, [addon.id]: session });
            }
            if (addon.kind === 'counter' && counterRevision === revision) setCounter(session);
            return session;
        },
        async dispatchMenuChoice(addon, choice, confirmation) {
            const timerBefore = timerRevision;
            const progressBefore = progressRevision;
            const counterBefore = counterRevision;
            const session = await adapter.menuChoice(addon, choice, confirmation);
            if (!disposed && addon.kind === 'timer' && timerRevision === timerBefore) setTimer(session);
            if (!disposed && addon.kind === 'progress' && progressRevision === progressBefore) {
                setProgress({ ...snapshot.progressTimerSessions, [addon.id]: session });
            }
            if (!disposed && addon.kind === 'counter' && counterRevision === counterBefore) setCounter(session);
            return session;
        },
        dispose() {
            disposed = true;
            unlisten.forEach((stop) => stop());
            unlisten = [];
        },
    };
}
