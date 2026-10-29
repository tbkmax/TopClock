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
- [x] the setting page should have different tab, which will include: Clock, Add-on, Shortcut, General
- [x] Clock tab is for setting like blink or not, font color, outline color, size..... should be reflect to the real one while changing (Not implment all of this right now, do few simple one create place holder fo rest)
- [x] Add-on tab is for like below clock can let user add timer or other region's clock (Not implement right now)
- [x] Shortcut tab, list all the shortcut
- [x] General tab is for setting like turn on open this when PC open or that kind of settings
- [x] add when user hold ctrl right click also will show setting

### TODO 3: Clock tab in setting
- [x] 24 or 12 hour time should be this page, and for 12 let user choose have AM PM or not
- [x] let user can set hour minute second in what every they like (can be H:M:S H:M M:S H M S)
- [x] also add outline size change slider
- [x] let user can choose font, make sure this app can run fully offline, so use font from user's PC's font family as default (but also add other modern way but if can't reach just make sure it will not have issues)
- [x] and make the current animation as default but search for Alpine.js and adding more animation choice (the color or other setting about animation should try to align with DESIGN.md)

### TODO 4: General tab in setting
- [x] place a button to open where all setting file were locate in this PC
- [x] currently the clock will only display in main display, which when user have multiple screen it won't show it other, make it by default will show on all display (even user plug in new screen after app open show detect and shows) (also position of each screen can be customizable and should be remember). For this on in general tab, add a setting that will have check box for user to select which screen to show the clock (which default will check all the box)

### TODO 5: Add-on tab
- [x] Design add-on system which user can add or remove the add-on which in this TODO will be consider as default add-on
- [x] Add-on can be place up or down of clock usually will be smaller text or even button to change any feature
- [x] Add-on will share space in up and down of clock which always consider about how to place it to make sure there is no conflict
- [x] dashboard: has place for user to customize the order of add-on that is turn on and text size of add-on, which for example add-on date and add-on
- [x] Add-on 1: date: when turn on can choose y-m-d or m-d or even d
- [x] Add-on 2: region clock: when turn on can choose which other region's time, text size will control in dashboard, the clock animation or design will follow the clock setting in clock tab (when change in clock tab here should also reflect)
- [x] Add-on 3: timer: when turn on will have a timer, which can set the shortcut for start stop and reset; all shortcut settings are configured exclusively in the Shortcut tab, not in the Add-on tab. Also when user press ctrl (which this key is configure in shortcut also) and click that timer it can start or stop the timer, and ctrl + right click's drop down menu will show reset timer also (only if this add on is turn on)

### TODO 6: Rename project, fix Readme, add icon
- [x] read though the project and suggest the better names that is not used (should list more than 5)
- [x] after select by user fix name use in this project include readme
- [x] generate icon based on project and name select by user using svg and replace the ico files 
- [x] fix Readme to modern simple README, include a banner  


### TODO 7: Shortcut Tab
- [x] Dedicated Shortcuts tab added to Settings with full ClickHouse / DESIGN.md styling
- [x] All shortcuts (including add-on shortcuts) are configured exclusively in the Shortcut tab
- [x] Clear visual separation between TopClock default shortcuts box and Add-on shortcuts box
- [x] Configurable interaction modifier key (`Ctrl`, `Alt`, `Shift`) polled natively in Win32 pointer monitor
- [x] Interactive key recording and "Clear" (unbind to None / no shortcut) functionality
- [x] Automated internal conflict detection flagging duplicate key combinations across actions
- [x] Add-on shortcuts locked/disabled when add-on is turned off, and editable when turned on
- [x] "Reset All Shortcuts to Default" action button
- [x] Dropdown menu dynamically displays configured hotkeys

### TODO 8: Update system
- [x] Lightweight GitHub Releases API update reminder (Option 1) without internal dropper/self-replacement code, keeping binary 100% free of Windows Defender heuristic flags
- [x] Zero corporate key purchases or private signing key management needed
- [x] General preferences UI additions:
  - Dynamic version indicator (`v0.0.0` default in dev)
  - Automatic update check toggle switch (`auto_check_updates` persisted in settings)
  - Software Updates status display with semver comparison against GitHub Releases
  - "Check for updates" manual check button
  - "Download Update ↗" action button opening the release page directly in the default browser
- [x] Fast GitHub Actions release workflow publishing NSIS setup installer, portable executable, and SHA-256 checksums
- [x] Detailed documentation and step-by-step guide added to `doc/UPDATE_SYSTEM.md`
