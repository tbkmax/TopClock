// The largest shadow is 0 8px 24px; leave room for its blur on every side.
export const MENU_SHADOW_SPACE = 48;

export function clockWindowLayout(clockWidth, clockHeight, menu = null) {
    const width = Math.max(60, Math.ceil(clockWidth) + 4);
    const height = Math.ceil(clockHeight) + 2;
    if (!menu) return { width, height };

    const x = Math.max(MENU_SHADOW_SPACE, Math.min(menu.x, width - menu.width - MENU_SHADOW_SPACE));
    const y = Math.max(MENU_SHADOW_SPACE, Math.ceil(clockHeight));
    return {
        x, y,
        width: Math.max(width, Math.ceil(x + menu.width + MENU_SHADOW_SPACE)),
        height: Math.max(height, Math.ceil(y + menu.height + MENU_SHADOW_SPACE)),
    };
}
