
### TODO 1: basic feature implementations, On top clock
- [x] create a always on top clock, with transparent window (only show the clock itself)
- [x] the default is white font color, with black outline (both of this should be setting in future, now don't need)
- [x] follow DESIGN.md
- [x] when user hold ctrl can drag and move the clock
- [x] when user ctrl + right click will show the drop down menu, now only show the quit
- [x] add animation for drop down menu (reference alpine.js style animation for that)
- [x] clock should also have animation

### TODO 2: setting window
- [x] when open it will create a icon in indicator bar, which click there will open setting page, right click will show the menu, currently only have quit
- [x] setting page should be follow DESIGN.md and use Alpine.js code reference include the animations
- [x] the minimize, and close button and window itself should also be part of design not using Windows own one
- [x] no full screen button, the size should not be able to change
- [ ] the setting page should have different tab, which will include: Clock, Add-on, Shortcut, General
- [x] Clock tab is for setting like blink or not, font color, outline color, size..... should be reflect to the real one while changing (Not implment all of this right now, do few simple one create place holder fo rest)
- [x] Add-on tab is for like below clock can let user add timer or other region's clock (Not implment right now)
- [ ] Shortcut tab, list all the shortcut
- [x] General tab is for setting like turn on open this when PC open or that kind of settings
- [ ] add when user hold ctrl right click also will show setting

### TODO 3: Clock tab in setting
- [x] 24 or 12 hour time should be this page, and for 12 let user choose have AM PM or not
- [x] let user can set hour minute second in what every they like (can be H:M:S H:M M:S H M S)
- [x] also add outline size change slider
- [x] let user can choose font, make sure this app can run fully offline, so use font from user's PC's font family as default (but also add other modern way but if can't reach just make sure it will not have issues)
- [x] and make the current animation as default but search for Alpine.js and adding more animation choice (the color or other setting about animation should try to align with DESIGN.md)

### TODO 4: General tab in setting
- [ ] place a button to open where all setting file were locate in this PC

### TODO 5: Add-on tab
- [ ]

### TODO 6: Rename project, fix Readme