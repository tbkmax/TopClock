### FIX 1: Not always on top situation:
- [ ] when some game when fullscreen size clock will not always on top
- [ ] when open some app like after clock open it (might not be the reasons), clock will not always on top (make sure clock will always on top)

### FIX 2: each time app start the start position not exactly in correct position
- [x] the position of clock will always a little bit right than where I stop

### FIX 3: have a little space on top which prevent clock to place closer to the topside of screen
- [x] removed top padding from `#app` and `.clock-container` so the clock can be positioned flush with the top edge of the screen
- [x] tightened native window bounds to hug the clock container (removing ~85px invisible vertical buffer)
- [x] replaced OS titlebar drag (`startDragging`) with direct pointer coordinate drag, eliminating Windows caption boundary clamping and bounce-back entirely

### FIX 4: when open program first time press ctrl, all clock invisible background will became white color (only first ctrl for every launch), when release ctrl will back to normal, but if holding ctrl will keep that white background
- [x] fix

### FIX 5: delete live layout in both Add-ons tab and Clock tab since the on-top preview is possible
-[ ] fix

### FIX6: in Shortcut tab, hide the shortcut of disabled add-on, only show when the related add-on is turn on
-[ ] fix

### FIX7: in setting page left top, replace to icon of this app
-[ ] fix
