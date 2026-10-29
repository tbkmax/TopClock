(finished TODO will be in Completed.md, only search if necessary)
(UI design generally should follow DESIGN.md)
### TODO 1: basic feature implementations, On top clock (Completed)

### TODO 2: setting window (Completed)

### TODO 3: Clock tab in setting (Partially archive in Completed)
- [ ] at the bottom add a reset position button, which put clock to the center to prevent user place clock to some where unreachable (Consider about Multiple Displays support (which reset position will reflect on all display))

### TODO 4: General tab in setting (Completed)
- [x] place a button to open where all setting file were locate in this PC
- [x] currently the clock will only display in main display, which when user have multiple screen it won't show it other, make it by default will show on all display (even user plug in new screen after app open show detect and shows) (also position of each screen can be customizable and should be remember). For this on in general tab, add a setting that will have check box for user to select which screen to show the clock (which default will check all the box)

### TODO 5: Add-on tab (Partially archive in Completed)
- [ ] Add-on 4: Progress bar: a bar that user can set the progress which have several mode: 1. date progress mode (user can set start date and end date, which start date by default will be set that day, and progress bar will display based on start date, current date, end. which color will change in period it is in starting period, near half, and close to end data and finished color). 2. time progress (user can set start time and end time, and this one will restart everyday if not turn off (for example start=2am end=3am, than after everyday before 2am is 0 progress, between 2 and 3 bar will in progress, after 3am will stay finished until next day), for this mode time progress will have option of auto hide after finished (which still set around 1 minutes after finished and hide), also this time progress mode can set multiple start and end time set, and finished hide will only happened when all of it in one day is finished, will have finished animation to remind user that it is finished, other than that is similar to date progress), which this add-on can have multiple (for example user want one time progress and one date progress) animation and style of progress bar should use reference of example of Alpine.js and DESIGN.md
- [ ] Add-on 5: TODO list

### TODO 6: Rename project, fix Readme, add icon (Completed)

### TODO 7: Shortcut Tab (Completed)

### TODO 8: Update system (Completed)

### TODO9: code structure maintain

### TODO10: Publish