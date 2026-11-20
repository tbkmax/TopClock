(finished TODO will be in Completed.md, only search if necessary)
(UI design generally should follow DESIGN.md)

### TODO 1: basic feature implementations, On top clock (Completed)

### TODO 2: setting window (Completed)

### TODO 3: Clock tab in setting (Partially archive in Completed)
- [ ] add default transparency settings (not when mouse on one, is default transparency, which by default is 0%). 
- [ ] a switch of that only show clock when reach on the hour, and if that is on also have another option to also shows on 30, which default is off, and when that switch on will show 1 minute long and hide, the hide is include add-on, but if turn on mouse palette that will still appear

### TODO 4: General tab in setting (Completed)

### TODO 5: Add-on tab (Partially archive in Completed)
- [ ] Add-on 7: Tracker: Automatically detect active use of user-configured apps or websites in TopClock. Decide how to detect a running source, define "active use," measure CPU/memory cost, and check Microsoft Store requirements before implementation. Tracker is one singleton add-on with no manual Count up/Count down controls. Its Details view assigns each configured source a count-up or count-down type. Record when each source is active, its type, each session, overall time, and per-source totals for future graphs. The clock shows only the currently active source's session in `HH:MM:SS`, starting at zero each time; it does not show the aggregate. Follow Counter's color treatment. Offer auto-hide when no configured source is active (default off), and show a yellow setup reminder when no source is configured. If Tracker is combined and inactive, show only the other member while keeping its alignment. TopClock alone originates detection-based Start/Stop; a future web client may display synced status or history but cannot detect local activity. Tracker storage and detection are separate from the Counter database change. See the [connected time concept](concept/CONNECTED_TIME_MODEL.md).
- [ ] Add-on Counter database change: Add local Counter transition and interval history for future graphs while preserving its signed balance and current behavior. This is the first database step, distinct from Tracker's future source detection and per-app history. Follow the [Counter database implementation plan](plan/COUNTER_DATABASE_CHANGE.md).
- [ ] New system, linking system: Link selected Timer, Counter, or Progress controls through a color group. Add a link icon at the right of each card; gray means unlinked. The panel starts with five colors and may offer more. Starting or stopping one member should affect its group, while each Settings control remains available. Define type-specific behavior before implementation. For any external web-service linking, especially a Counter controlled from TopClock or the web, follow the [connected time concept](concept/CONNECTED_TIME_MODEL.md). Write feature documentation under `doc/feature/` when implemented. (WIP)
- [ ] every add-on will have `only display when pressing Interaction Modifier mode`, default is off, and is separate with different add-on

### TODO 6: Rename project, fix Readme, add icon (Completed)

### TODO 7: Shortcut Tab (Partially archive in Completed)
- [ ] add shortcut when pressing Interaction Modifier and mouse on clock user can use roller to increase and decrease the default transparency of the clock, and this is turn off by default, and this is nothing to do with mouse on clock without pressing Interaction Modifier

### TODO 8: Update system (Completed)

### TODO9: code structure maintain (Completed)

### TODO10: Publish (Completed)

### TODO 11: Pages (Completed)

### TODO 12: Mouse palette (Completed)
