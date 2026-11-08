import { nativeAddonAdapter } from './native-adapter.js';

export function createAddonState({ adapter = nativeAddonAdapter, onChange = () => {} } = {}) {
    let timerSession = null;
    let progressTimerSessions = {};
    let timerRevision = 0;
    let progressRevision = 0;
    let started = false;
    let disposed = false;
    let unlisten = [];
    const notify = () => onChange({ timerSession, progressTimerSessions });
    const setTimer = (value) => { timerSession = value; timerRevision++; notify(); };
    const setProgress = (value) => { progressTimerSessions = value; progressRevision++; notify(); };
    return {
        get snapshot() { return { timerSession, progressTimerSessions }; },
        setTimer,
        setProgress,
        async start() {
            if (started) return;
            started = true;
            try {
                unlisten.push(await adapter.onTimer((value) => { if (!disposed) setTimer(value); }));
                unlisten.push(await adapter.onProgress((value) => { if (!disposed) setProgress(value); }));
                if (disposed) { unlisten.forEach((stop) => stop()); return; }
                const timerBefore = timerRevision;
                const progressBefore = progressRevision;
                const [timer, progress] = await Promise.all([adapter.getTimer(), adapter.getProgress()]);
                if (disposed) return;
                if (timerRevision === timerBefore) setTimer(timer);
                if (progressRevision === progressBefore) setProgress(progress);
            } catch (error) {
                unlisten.forEach((stop) => stop());
                unlisten = [];
                started = false;
                throw error;
            }
        },
        async dispatch(addon, action) {
            const revision = addon.kind === 'timer' ? timerRevision : progressRevision;
            const session = await adapter.action(addon, action);
            if (disposed) return session;
            // A broadcast received while the command was pending is at least as fresh
            // as its returned snapshot, so do not overwrite it.
            if (addon.kind === 'timer' && timerRevision === revision) setTimer(session);
            if (addon.kind === 'progress' && progressRevision === revision) {
                setProgress({ ...progressTimerSessions, [addon.id]: session });
            }
            return session;
        },
        dispose() {
            disposed = true;
            unlisten.forEach((stop) => stop());
            unlisten = [];
        },
    };
}
