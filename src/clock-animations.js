export const colonAnimations = [
    { value: 'pulse', label: 'Classic pulse' },
    { value: 'fade', label: 'Soft fade' },
    { value: 'slide', label: 'Gentle slide' },
    { value: 'none', label: 'None' },
];

export const numberAnimations = [
    { value: 'tick', label: 'Yellow tick' },
    { value: 'fade', label: 'Soft fade' },
    { value: 'slide', label: 'Gentle slide' },
    { value: 'none', label: 'None' },
];

// Track each displayed number separately so every layout can animate value changes.
export function markChangedNumbers(parts, previousNumbers = {}, activeUntil = {}, now = Date.now()) {
    const numbers = {};
    const nextActiveUntil = {};
    const markedParts = parts.map((part) => {
        if (!['h', 'm', 's'].includes(part.kind)) return part;
        numbers[part.kind] = part.text;
        const changed = previousNumbers[part.kind] !== undefined
            && previousNumbers[part.kind] !== part.text;
        const until = changed ? now + 300 : (activeUntil[part.kind] || 0);
        nextActiveUntil[part.kind] = until;
        return { ...part, changing: now < until };
    });
    return { parts: markedParts, numbers, activeUntil: nextActiveUntil };
}
