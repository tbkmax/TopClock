# Frontend localization architecture

This folder owns bundled frontend text for the clock, Settings, menu, palette, and add-on views. See the [parent frontend architecture](../../doc/architecture.md) for those pages and the separate Rust tray translations.

[messages.js](../messages.js) stores English, Simplified Chinese, Traditional Chinese, and Japanese strings together by stable key. [index.js](../index.js) resolves the saved or system language, interpolates `{variables}`, formats localized weekdays, and applies explicit `data-i18n-*` keys to static markup. Reactive Alpine labels call `translate` through each page's `t()` method. The static translator handles text, title, aria-label, and placeholder attributes in initial markup and later Alpine template clones. It preserves the original text node for language switching and does not replace child elements.

The translations are local bundle data and require no network access. `ClockSettings.language` is persisted by Rust; system locale is read at startup and is not saved. Unknown locale preferences and missing translations fall back to English where a row exists; an unknown key returns the key itself. The [Settings page](../../settings/doc/architecture.md) previews a language change before its normal save. All four locale variants share one key and variable contract, checked by [frontend tests](../../frontend.test.js).
