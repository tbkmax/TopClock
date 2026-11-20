# Frontend localization changelog

### Changed

#### 2026-11-19 - Explain Counter history deletion in Reset confirmation

- The Counter Reset warning now says the saved balance and all Counter history will be cleared in English, Simplified Chinese, Traditional Chinese, and Japanese. No saved language field changes.

#### 2026-11-17 - Key static translations explicitly

- Created this folder and its `doc/` folder, separated message data from localization behavior, and replaced English-text lookup with stable markup keys. Existing saved language values and the four bundled languages remain compatible. No operator action is required.
