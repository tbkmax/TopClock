export const PALETTE_RADII = [58, 148, 238, 328];
const PAGE_SIZE = 6;

export function paletteTree(menuEntries, toggleEntries, t) {
    const nodes = [{ id: 'settings', label: t('app.settings'), operation: { type: 'settings' } }];
    for (const entry of menuEntries) {
        if (entry.type === 'action') {
            nodes.push({ id: `action:${entry.instanceId}:${entry.action.id}`,
                label: t(entry.action.menuLabelKey || entry.action.labelKey),
                operation: { type: 'action', instanceId: entry.instanceId, actionId: entry.action.id } });
            continue;
        }
        const children = [
            ...entry.actions.map((action) => ({ id: `action:${action.id}`, label: t(action.labelKey),
                operation: { type: 'action', instanceId: entry.instanceId, actionId: action.id } })),
            ...entry.sections.filter((section) => section.choices.length).map((section) => ({
                id: `section:${section.id}`, label: t(section.labelKey),
                children: section.choices.map((choice) => ({
                    id: `choice:${choice.id}`, label: t(choice.labelKey, choice.labelVars), disabled: Boolean(choice.selected),
                    operation: { type: 'choice', instanceId: entry.instanceId, choiceId: choice.id,
                        confirm: choice.confirm || null },
                })),
            })),
        ];
        if (children.length) nodes.push({ id: `group:${entry.instanceId}`, label: entry.name, children });
    }
    if (toggleEntries.length) {
        const switches = toggleEntries.map((entry) => ({ id: `toggle:${entry.id}`, label: entry.name,
            operation: { type: 'toggle', instanceId: entry.id, enabled: !entry.enabled } }));
        const children = switches.length <= 8 ? switches
            : Array.from({ length: Math.ceil(switches.length / PAGE_SIZE) }, (_, index) => ({
                id: `switch-range:${index}`, label: `${index * PAGE_SIZE + 1}–${Math.min(switches.length, (index + 1) * PAGE_SIZE)}`,
                children: switches.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE),
            }));
        nodes.push({ id: 'addon-switches', label: t('palette.addonSwitch'), children });
    }
    nodes.push({ id: 'quit', label: t('app.quit'), operation: { type: 'quit' } });
    return nodes;
}

export function pendingPaletteChoice(menuEntries, pending) {
    if (!pending) return null;
    const entry = menuEntries.find((item) => item.type === 'group' && item.instanceId === pending.instance_id);
    const choice = entry?.choices.find((item) => item.id === pending.choice_id);
    return choice?.confirm ? { entry, choice } : null;
}

export function pageNodes(nodes, page, t) {
    const count = Math.max(1, Math.ceil(nodes.length / PAGE_SIZE));
    const current = Math.min(Math.max(0, page), count - 1);
    const result = nodes.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
    if (current > 0) result.unshift({ id: 'page-back', label: t('palette.back'), page: current - 1 });
    if (current < count - 1) result.push({ id: 'page-more', label: t('palette.more'), page: current + 1 });
    return result;
}

export function ringAndIndex(pointer, nodes) {
    if (!pointer || !nodes?.length) return null;
    const dx = pointer.x - pointer.center_x;
    const dy = pointer.y - pointer.center_y;
    const distance = Math.hypot(dx, dy);
    const ring = PALETTE_RADII.findIndex((radius, index) => index < PALETTE_RADII.length - 1
        && distance >= radius && distance < PALETTE_RADII[index + 1]);
    if (ring < 0) return null;
    const angle = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    return { ring, index: Math.min(nodes.length - 1, Math.floor(angle / (2 * Math.PI) * nodes.length)), distance };
}

export function sectorPath(cx, cy, inner, outer, index, count) {
    const start = -Math.PI / 2 + 2 * Math.PI * index / count;
    const end = -Math.PI / 2 + 2 * Math.PI * (index + 1) / count;
    const polar = (radius, angle) => [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    const [x1, y1] = polar(outer, start);
    const [x2, y2] = polar(outer, end);
    const [x3, y3] = polar(inner, end);
    const [x4, y4] = polar(inner, start);
    return `M ${x1} ${y1} A ${outer} ${outer} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2}`
        + ` L ${x3} ${y3} A ${inner} ${inner} 0 ${end - start > Math.PI ? 1 : 0} 0 ${x4} ${y4} Z`;
}

export function sectorLabel(cx, cy, inner, outer, index, count) {
    const angle = -Math.PI / 2 + 2 * Math.PI * (index + 0.5) / count;
    const radius = (inner + outer) / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

export function fitSectorLabel(label, inner, outer, count, measureAt14px) {
    const baseSize = 14;
    const minSize = 10;
    const radius = (inner + outer) / 2;
    const arcWidth = count === 1 ? Infinity : 2 * radius * Math.sin(Math.PI / count);
    const availableWidth = Math.max(20, Math.min(outer - inner, arcWidth) - 10);
    const measuredWidth = measureAt14px(label);
    if (!measuredWidth || measuredWidth <= availableWidth) return { text: label, fontSize: baseSize };
    const fontSize = Math.max(minSize, Math.floor(baseSize * availableWidth / measuredWidth * 10) / 10);
    if (measuredWidth * fontSize / baseSize <= availableWidth) return { text: label, fontSize };

    const characters = Array.from(label);
    for (let length = characters.length - 1; length >= 0; length--) {
        const text = `${characters.slice(0, length).join('')}…`;
        if (measureAt14px(text) * fontSize / baseSize <= availableWidth) return { text, fontSize };
    }
    return { text: '', fontSize };
}
