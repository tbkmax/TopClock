# Settings page changelog

### Changed

#### 2026-11-17 - Group Settings code and explicit native hooks

- Created this folder and its `doc/` folder, moved the Settings page modules here, and separated native event registration, failed-save session readback, and preview rendering from the page coordinator. The Settings page still uses the same commands, saved fields, and preview behavior. No operator action is required.
