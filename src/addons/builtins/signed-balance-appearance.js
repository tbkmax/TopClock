// Keep signed time colors independent of any add-on's formatting or session shape.
const COLORS = {
    running: { positive: '#3b82f6', negative: '#ef4444' },
    stopped: { positive: '#93c5fd', negative: '#fca5a5' },
};

export const DEFAULT_HALO_INTENSITY_PERCENT = 50;

export function haloIntensityPercent(value) {
    return Number.isInteger(value) && value >= 0 && value <= 100 ? value : DEFAULT_HALO_INTENSITY_PERCENT;
}

export function signedBalanceAppearance(valueMs, running, runningDirection = 0, intensityPercent = DEFAULT_HALO_INTENSITY_PERCENT) {
    const direction = valueMs < 0 ? 'negative' : valueMs > 0 ? 'positive' : 'zero';
    const motion = running && runningDirection > 0 ? 'up' : running && runningDirection < 0 ? 'down' : null;
    const intensity = haloIntensityPercent(intensityPercent) / 100;
    return {
        direction,
        color: direction === 'zero' ? null : COLORS[running ? 'running' : 'stopped'][direction],
        motion,
        glowStyle: motion ? {
            '--text-glow-near-alpha': Math.min(1, 1.8 * intensity).toFixed(3),
            '--text-glow-far-alpha': intensity.toFixed(3),
        } : null,
    };
}
