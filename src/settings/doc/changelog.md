# Settings page changelog

### Changed

#### 2026-11-19 - Add Clock visibility controls

- Added baseline transparency, hourly display, and optional half-hour display controls to the Clock tab. The preview shows the chosen baseline transparency; the desktop schedule does not blank the styling preview. Existing save and failed-save recovery paths are reused.

#### 2026-11-19 - Warn before destructive Counter Reset

- The existing confirmation modal now states that Reset deletes the saved balance and all Counter history. Cancel and Confirm controls are unchanged; no settings migration is needed.

#### 2026-11-17 - Use two states for the Combined control

- A pair with one enabled member now shows the Combined switch as on. Clicking it turns both off, and clicking it again turns both on. The two member switches remain independent and no saved field changes.

#### 2026-11-17 - Add independent combined-member switches

- The Add-ons card now shows three controls for a pair: two member switches and a Combined control. The latter turns both off when both are on, and both on otherwise. Mixed state is visible, and the preview keeps the one visible member centered at the pair's shared scale. No settings migration is needed.

#### 2026-11-17 - Group Settings code and explicit native hooks

- Created this folder and its `doc/` folder, moved the Settings page modules here, and separated native event registration, failed-save session readback, and preview rendering from the page coordinator. The Settings page still uses the same commands, saved fields, and preview behavior. No operator action is required.
