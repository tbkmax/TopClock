(finished TODO will be in Completed.md, only search if necessary)
(UI design generally should follow DESIGN.md)
### TODO 1: basic feature implementations, On top clock (Completed)

### TODO 2: setting window
- [x] when open it will create a icon in indicator bar, which click there will open setting page, right click will show the menu, currently only have quit
- [x] setting page should be follow DESIGN.md and use Alpine.js code reference include the animations
- [x] the minimize, and close button and window itself should also be part of design not using Windows own one
- [x] no full screen button, the size should not be able to change
- [x] the setting page should have different tab, which will include: Clock, Add-on, Shortcut, General
- [x] Clock tab is for setting like blink or not, font color, outline color, size..... should be reflect to the real one while changing (Not implment all of this right now, do few simple one create place holder fo rest)
- [x] Add-on tab is for like below clock can let user add timer or other region's clock (Not implement right now)
- [x] Shortcut tab, list all the shortcut
- [x] General tab is for setting like turn on open this when PC open or that kind of settings
- [x] add when user hold ctrl right click also will show setting

### TODO 3: Clock tab in setting (Completed)

### TODO 4: General tab in setting
- [ ] place a button to open where all setting file were locate in this PC
- [ ] currently the clock will only display in main display, which when user have multiple screen it won't show it other, make it by default will show on all display (even user plug in new screen after app open show detect and shows) (also position of each screen can be customizable and should be remember). For this on in general tab, add a setting that will have check box for user to select which screen to show the clock (which default will check all the box)

### TODO 5: Add-on tab
- [ ] Design add-on system which user can add or remove the add-on which in this TODO will be consider as default add-on
- [ ] Add-on can be place up or down of clock usually will be smaller text or even button to change any feature
- [ ] Add-on will share space in up and down of clock which always consider about how to place it to make sure there is no conflict
- [ ] dashboard: has place for user to customize the order of add-on that is turn on and text size of add-on, which for example add-on date and add-on
- [ ] Add-on 1: date: when turn on can choose y-m-d or m-d or even d
- [ ] Add-on 2: region clock: when turn on can choose which other region's time, text size will control in dashboard, the clock animation or design will follow the clock setting in clock tab (when change in clock tab here should also reflect)
- [ ] Add-on 3: timer: when turn on will have a timer, which can set the shortcut for start stop and reset; all shortcut settings are configured exclusively in the Shortcut tab, not in the Add-on tab

### TODO 6: Rename project, fix Readme, add icon (Completed)

### TODO 7: Shortcut Tab (Completed)
- [x] add a place for show all shortcut in here, which they can be change and will also show the conflict
- [x] all shortcuts (including add-on shortcuts) are configured exclusively in the Shortcut tab
- [x] internal conflict detection prevents clashes across default and add-on shortcuts
- [x] support setting "No shortcut" (unbind) for actions
- [x] add-on shortcuts are separated into a distinct box from TopClock default shortcuts
- [x] add-on shortcuts are only changeable when the respective add-on is enabled (turned on)

### TODO 8: Update system (Completed)
