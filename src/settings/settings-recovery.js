// A failed settings write may have changed native add-on sessions. Read them
// back before restoring the visible draft; retain the last snapshot if one
// read fails, matching the prior recovery behavior.
export async function readAddonSessions(invoke, fallback, reportError = console.error) {
    const sessions = { ...fallback };
    for (const [field, command, label] of [
        ['timerSession', 'get_timer_state', 'timer'],
        ['progressTimerSessions', 'get_progress_timer_states', 'Progress countdowns'],
        ['counterSession', 'get_counter_state', 'Counter'],
    ]) {
        try { sessions[field] = await invoke(command); }
        catch (error) { reportError(`Could not reload ${label} after failed save:`, error); }
    }
    return sessions;
}
