// The clock window sizes only to its own content. The menu has a separate window.
export function clockWindowLayout(clockWidth, clockHeight) {
    const width = Math.max(60, Math.ceil(clockWidth) + 4);
    const height = Math.ceil(clockHeight) + 2;
    return { width, height };
}
