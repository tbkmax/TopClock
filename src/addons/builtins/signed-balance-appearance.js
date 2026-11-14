// Keep signed time colors independent of any add-on's formatting or session shape.
const COLORS = {
    running: { positive: '#3b82f6', negative: '#ef4444' },
    stopped: { positive: '#93c5fd', negative: '#fca5a5' },
};

export function signedBalanceAppearance(valueMs, running) {
    const direction = valueMs < 0 ? 'negative' : valueMs > 0 ? 'positive' : 'zero';
    return {
        direction,
        color: direction === 'zero' ? null : COLORS[running ? 'running' : 'stopped'][direction],
    };
}
