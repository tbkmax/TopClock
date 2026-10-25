# Fix 3 Report: Screen Edge Spacing & Drag Bounce-Back

## Problem
When dragging the clock near the top (or any) edge of the screen:
1. There was visible empty space at the top preventing the clock from sitting close to the screen edge.
2. Dragging the clock closer to the edge caused it to "bounce back" away from the border, feeling like an invisible title bar was hitting a barrier.

---

## Root Causes

1. **Internal CSS Padding & Oversized Window**:
   - `#app` and `.clock-container` had hardcoded top padding (`6px` + `4px`).
   - The native window had minimum size constraints (`110px` height and `150px` width). Even with a 42px font, the window was over 110px tall, creating a large invisible transparent collision box around the numbers that hit screen edges first.

2. **The "Virtual Title Bar" (`HTCAPTION`)**:
   - Calling Tauri's native `appWindow.startDragging()` sends a Win32 message with `HTCAPTION` (Hit-Test Caption / Title Bar).
   - This tricked the Windows OS into treating the clock as a standard application title bar.
   - Windows title bar rules strictly clamp dragging to the monitor work area ($Y \ge 0$) and trigger **Aero Snap** (maximize/snap) at the screen edges. Because TopClock is borderless and non-resizable, Windows rejected the snap and played an OS **bounce-back** animation.

---

## Solution Implemented

1. **Direct Pointer Dragging (Eliminates the "Virtual Title Bar")**:
   - Replaced `appWindow.startDragging()` with direct pointer coordinate tracking in [src/main.js](../../src/main.js) and [index.html](../../index.html).
   - Moves the window using `appWindow.setPosition` synchronized with `requestAnimationFrame`.
   - **Result**: Windows OS title bar dragging is completely bypassed. Zero Aero Snap, zero edge resistance, and zero bounce-back.

2. **Tight Window Fit**:
   - In [src/style.css](../../src/style.css), removed `padding-top` from `#app` and `.clock-container` so the digits sit flush against the top of the window ($Y = 0$).
   - In [src/main.js](../../src/main.js), dynamically size the native window to the exact dimensions of the clock container (expanding height only when the right-click menu is open).
   - Preserved initial launch position on startup to prevent rightward position drift.

3. **OS Maximize Disabled**:
   - Added `"maximizable": false` to the `main` window config in [src-tauri/tauri.conf.json](../../src-tauri/tauri.conf.json).

---

## Result
- The clock numerals can now be dragged directly flush against the screen bezel.
- The drag feels smooth, responsive, and never bounces back.
