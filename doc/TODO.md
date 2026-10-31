(finished TODO will be in Completed.md, only search if necessary)
(UI design generally should follow DESIGN.md)
### TODO 1: basic feature implementations, On top clock (Completed)

### TODO 2: setting window (Completed)

### TODO 3: Clock tab in setting (Partially archive in Completed)
- [ ] add default transparency settings (not when mouse on one, is default transparency, which by default is 0%). 

### TODO 4: General tab in setting (Completed)

### TODO 5: Add-on tab (Partially archive in Completed)
- [x] Add-on 4: Progress bar: a bar that user can set the progress which have several mode: 1. date progress mode (user can set start date and end date, which start date by default will be set that day, and progress bar will display based on start date, current date, end. which color will change in period it is in starting period, near half, and close to end data and finished color). 2. time progress (user can set start time and end time, and this one will restart everyday if not turn off (for example start=2am end=3am, than after everyday before 2am is 0 progress, between 2 and 3 bar will in progress, after 3am will stay finished until next day), for this mode time progress will have option of auto hide after finished (which still set around 1 minutes after finished and hide), also this time progress mode can set multiple start and end time set, and finished hide will only happened when all of it in one day is finished, will have finished animation to remind user that it is finished, other than that is similar to date progress), which this add-on can have multiple (for example user want one time progress and one date progress) animation and style of progress bar should use reference of example of Alpine.js and DESIGN.md
- [ ] Add-on 5: TODO list
- [ ] every add-on will have `only display when pressing Interaction Modifier mode`, default is off, and is separate with different add-on

### TODO 6: Rename project, fix Readme, add icon (Completed)

### TODO 7: Shortcut Tab (Partially archive in Completed)
- [ ] add shortcut when pressing Interaction Modifier and mouse on clock user can use roller to increase and decrease the default transparency of the clock, and this is turn off by default, and this is nothing to do with mouse on clock without pressing Interaction Modifier

### TODO 8: Update system (Completed)

### TODO9: code structure maintain (Completed)

### TODO10: Publish