(finished TODO will be in Completed.md, only search if necessary)
(UI design generally should follow DESIGN.md)

### TODO 1: basic feature implementations, On top clock (Completed)

### TODO 2: setting window (Completed)

### TODO 3: Clock tab in setting (Partially archive in Completed)
- [ ] add default transparency settings (not when mouse on one, is default transparency, which by default is 0%). 

### TODO 4: General tab in setting (Completed)

### TODO 5: Add-on tab (Partially archive in Completed)
- [x] Add-on 5: Counter (name it if there is any better one): add a add-on that this add-on will hold a timer that user can start in both directions, for example when user can use this as a counter toward playing decrease and working increase that time, which this timer should accept the minus and positive state, that this is for long use so it should able to auto change time scale, that should consider if user have serval hour should change to day : hour, in start should be hour : minute, if hour grow to 3 digits change to day : hour, if that is within 1 hour than hour : minute, should have reset button but should have notification to ask user are you sure to do that, in on-top layout when it is minus don't use minus sign use color to inform user (so check design.md to choose positive and negative color), also for submenu should only have start positive and start negative (name it better if there is) should not have reset, reset should only in add-on setting page, this timer should not automatically reset if user restart or close app, if user quit top clock before stop this counter just stop and save it automatically, this counter's timer is nothing relate to other timer or progress's time count 
- [ ] Add-on 6: Mouse palette: can set a shortcut key (can't be same with modifier key) that when pressing that key will show a circle around user mouse which that just generally display what in submenu, and when user move there mouse to there side and release key will do that. for the add-on's control that has button like 'Counter' just create another circle outside the original circle to display that choice when mouse stay on 'Counter', because we are select based on position of mouse not direction of mouse so when user move back to original window's other than add-on that have button or more just hide, or even move to other add-on in main window also change what display in outside, also consider about that add-on that have 'set' in that case just use another outside circle, which max is 3. for the tracking this kind of case try to create a maintainable architecture or consider about need to move this feature to General setting rather than add-on to directly ask all add-on to provide better formatted submenu pattern to prevent future add-on's scale over what mouse palette can handle, also for shortcut can set to none, which default is none
- [ ] Add-on 7: Tracker: A auto counter that user can set game or website, which will automatically tracking the active use time (how to track time? through what is running? do this waste memory or CPU actively?) (how to define 'active' use time) (do this add-on going to much and might violate Microsoft store rules?). This add-on is basically a automatically running 'Counter' which is will separate two type of 'web or app' that one is Count up type another type is count down type. In the add add-on's detail button can set 'web or app' is in count up or count down type, and this add-on is only one instance type which only allow one exist. This tracker will record: when, count up or count down, what 'web or app' (should we consider about to create a db for this?) In the on top clock UI part, it will only display the current tracking session's time, which color will follow exactly what Counter take, the difference from Counter is that Tracker is not recording the total time, so basically format is HH : MM : SS, and will have a checkbox for auto hide which when tracker is not detect in the setting will auto hide (default is off). when realize user didn't set at least one count up or count down use yellow color reminder to tell user where and how to set it in the instance. For the Tracker that is in Combine also should let UI only show the another one and keep align stay correctly. (WIP)
- [ ] New system, linking system: (write a feature documentation into doc feature after finished): which can link some of timer or counter or progress bar, that in each card most right (outside card itself) will have a button that have a linking icon, default is gray color which means no linking, and when press it will open a panel, that default will have 5 color (can add more) and when pick that color means the time will sync, in setting all control will stay same but start or stop any of it will sync to all in same group (WIP....)
- [ ] every add-on will have `only display when pressing Interaction Modifier mode`, default is off, and is separate with different add-on

### TODO 6: Rename project, fix Readme, add icon (Completed)

### TODO 7: Shortcut Tab (Partially archive in Completed)
- [ ] add shortcut when pressing Interaction Modifier and mouse on clock user can use roller to increase and decrease the default transparency of the clock, and this is turn off by default, and this is nothing to do with mouse on clock without pressing Interaction Modifier

### TODO 8: Update system (Completed)

### TODO9: code structure maintain (Completed)

### TODO10: Publish (Completed)

### TODO 11: Pages (Completed)
