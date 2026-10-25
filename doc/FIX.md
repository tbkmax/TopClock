### FIX 1: Not always on top situation:
- [ ] when some game when fullscreen size clock will not always on top
- [ ] when open new app like browser after clock open it (might not be the reasons), clock will not always on top (make sure clock will always on top)

### FIX 2: each time app start the start position not exactly in correct position
- [ ] the position of clock will always a little bit right than where I stop 

### FIX 3: have a little space on top which prevent clock to place closer to the topside of screen
- [x] removed top padding from `#app` and `.clock-container` so the clock can be positioned flush with the top edge of the screen
- [x] tightened native window bounds to hug the clock container (removing ~85px invisible vertical buffer)
- [x] replaced OS titlebar drag (`startDragging`) with direct pointer coordinate drag, eliminating Windows caption boundary clamping and bounce-back entirely
