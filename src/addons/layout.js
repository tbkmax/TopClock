// The flat instance list remains the source of order and placement. Pair records
// add only the relationship and shared scale, so older builds can read instances.
export function addonLayout(addons = [], pairs = []) {
    const byLeft = new Map(pairs.map((pair) => [pair.left_id, pair]));
    const rows = [];
    for (let index = 0; index < addons.length; index++) {
        const first = addons[index];
        const pair = byLeft.get(first.id);
        const second = addons[index + 1];
        if (pair && second?.id === pair.right_id && second.placement === first.placement) {
            rows.push({ id: `pair-${first.id}`, placement: first.placement, items: [first, second], pair });
            index++;
        } else {
            rows.push({ id: first.id, placement: first.placement, items: [first], pair: null });
        }
    }
    return rows;
}

export function displayLayout(addons = [], pairs = []) {
    return addonLayout(addons, pairs).map((row) => ({
        ...row,
        items: row.items.map((addon) => ({
            ...addon,
            effective_size_percent: addon.size_percent * (row.pair?.size_percent ?? 100) / 100,
        })),
    }));
}

export function pairFor(pairs = [], id) {
    return pairs.find((pair) => pair.left_id === id || pair.right_id === id);
}

export function canPair(addons, pairs, sourceId, targetId) {
    const source = addons.find((addon) => addon.id === sourceId);
    const target = addons.find((addon) => addon.id === targetId);
    return Boolean(source && target && source !== target
        && ['date', 'region_clock', 'timer', 'counter'].includes(source.kind)
        && ['date', 'region_clock', 'timer', 'counter'].includes(target.kind)
        && !pairFor(pairs, sourceId) && !pairFor(pairs, targetId));
}

export function combineAddons(addons, pairs, sourceId, targetId, after = true) {
    if (!canPair(addons, pairs, sourceId, targetId)) return null;
    const source = addons.find((addon) => addon.id === sourceId);
    const target = addons.find((addon) => addon.id === targetId);
    const remaining = addons.filter((addon) => addon.id !== sourceId);
    const index = remaining.findIndex((addon) => addon.id === targetId);
    const moved = { ...source, placement: target.placement, enabled: target.enabled };
    remaining.splice(index + Number(after), 0, moved);
    const left_id = after ? targetId : sourceId;
    const right_id = after ? sourceId : targetId;
    return { addons: remaining, pairs: [...pairs, { left_id, right_id, size_percent: 100 }] };
}

export function swapPair(addons, pairs, id) {
    const pair = pairFor(pairs, id);
    if (!pair) return null;
    const index = addons.findIndex((addon) => addon.id === pair.left_id);
    if (index < 0 || addons[index + 1]?.id !== pair.right_id) return null;
    const next = [...addons];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    return {
        addons: next,
        pairs: pairs.map((item) => item.left_id === pair.left_id
            ? { ...item, left_id: pair.right_id, right_id: pair.left_id } : item),
    };
}

export function moveAddonLayout(addons, pairs, sourceId, targetId, placement, after = false, wholePair = false) {
    const sourcePair = pairFor(pairs, sourceId);
    const movingIds = wholePair && sourcePair
        ? [sourcePair.left_id, sourcePair.right_id] : [sourceId];
    if (targetId && movingIds.includes(targetId)) return null;
    if (!['above', 'below'].includes(placement)) return null;
    const moving = addons.filter((addon) => movingIds.includes(addon.id));
    if (moving.length !== movingIds.length) return null;
    const nextPairs = wholePair ? [...pairs] : pairs.filter((pair) =>
        !sourcePair || pair.left_id !== sourcePair.left_id);
    const remaining = addons.filter((addon) => !movingIds.includes(addon.id));
    const targetPair = targetId ? pairFor(nextPairs, targetId) : null;
    const boundaryId = targetPair ? (after ? targetPair.right_id : targetPair.left_id) : targetId;
    const above = remaining.filter((addon) => addon.placement === 'above');
    const below = remaining.filter((addon) => addon.placement === 'below');
    const group = placement === 'above' ? above : below;
    const moved = moving.map((addon) => ({ ...addon, placement }));
    if (boundaryId) {
        const index = group.findIndex((addon) => addon.id === boundaryId);
        if (index < 0) return null;
        group.splice(index + Number(after), 0, ...moved);
    } else if (placement === 'above') group.push(...moved);
    else group.unshift(...moved);
    const next = [...above, ...below];
    if (nextPairs.length === pairs.length && next.every((addon, index) =>
        addon.id === addons[index]?.id && addon.placement === addons[index]?.placement)) return null;
    return { addons: next, pairs: nextPairs };
}
