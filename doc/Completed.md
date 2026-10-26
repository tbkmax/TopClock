### TODO 1: basic feature implementations, On top clock
- [x] create a always on top clock, with transparent window (only show the clock itself)
- [x] the default is white font color, with black outline (both of this should be setting in future, now don't need)
- [x] follow DESIGN.md
- [x] when user hold ctrl can drag and move the clock
- [x] when user ctrl + right click will show the drop down menu, now only show the quit
- [x] add animation for drop down menu (reference alpine.js style animation for that)
- [x] clock should also have animation

### TODO 3: Clock tab in setting
- [x] 24 or 12 hour time should be this page, and for 12 let user choose have AM PM or not
- [x] let user can set hour minute second in what every they like (can be H:M:S H:M M:S H M S)
- [x] also add outline size change slider
- [x] let user can choose font, make sure this app can run fully offline, so use font from user's PC's font family as default (but also add other modern way but if can't reach just make sure it will not have issues)
- [x] and make the current animation as default but search for Alpine.js and adding more animation choice (the color or other setting about animation should try to align with DESIGN.md)

### TODO 6: Rename project, fix Readme, add icon
- [x] read though the project and suggest the better names that is not used (should list more than 5)
- [x] after select by user fix name use in this project include readme
- [x] generate icon based on project and name select by user using svg and replace the ico files 
- [x] fix Readme to modern simple README, include a banner  


### TODO 8: Update system
- [x] In-app updater powered by Tauri 2 updater plugin (`tauri-plugin-updater`, `@tauri-apps/plugin-updater`) targeting GitHub Releases endpoint
- [x] Free Minisign / Ed25519 cryptographic key pair for release signature verification without requiring costly Microsoft Authenticode / EV certificates
- [x] Safe in-app restart plugin (`tauri-plugin-process`, `@tauri-apps/plugin-process`) for 1-click update & relaunch
- [x] General preferences UI additions:
  - Dynamic version indicator (`v0.1.0`)
  - Automatic update check toggle switch (`auto_check_updates` persisted in settings)
  - Software Updates status display
  - "Check for updates" manual check button
  - "Update & Restart" action button with live percentage download progress
- [x] GitHub Actions release workflow updated to sign updater bundles and publish `latest.json`, `.zip`, and `.sig` assets
- [x] `.gitignore` updated to safeguard signing keys (`*.key`, `*.key.pub`, `/.tauri/`)
- [x] Detailed documentation and step-by-step guide added to `doc/UPDATE_SYSTEM.md`
