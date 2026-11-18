import { messages } from './messages.js';

const indexes = { en: 0, 'zh-Hans': 1, 'zh-Hant': 2, ja: 3 };
const originalText = new WeakMap();
let domLanguage = 'en';
let observer;
const weekdayFormatters = new Map();

export function resolveLanguage(preference = 'system', systemLocale = 'en') {
    const locale = (preference === 'system' ? systemLocale : preference).toLowerCase();
    if (locale.startsWith('ja')) return 'ja';
    if (locale.startsWith('zh')) {
        return /hant|^zh-(tw|hk|mo)(-|$)/.test(locale) ? 'zh-Hant' : 'zh-Hans';
    }
    return 'en';
}

export function translate(language, key, vars = {}) {
    const row = messages[key];
    if (!row) return key;
    const template = row[indexes[language] ?? 0] || row[0];
    return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

// Explicit keys survive English copy edits and distinguish equal phrases in
// different contexts. Dynamic x-text nodes stay under Alpine's control.
function translateMarkup(root) {
    if (!root || typeof document === 'undefined') return;
    const selector = '[data-i18n-text], [data-i18n-title], [data-i18n-aria-label], [data-i18n-placeholder]';
    const elements = root.nodeType === Node.ELEMENT_NODE && root.matches(selector)
        ? [root, ...root.querySelectorAll(selector)]
        : [...root.querySelectorAll(selector)];
    for (const element of elements) {
        for (const name of ['title', 'aria-label', 'placeholder']) {
            const key = element.getAttribute(`data-i18n-${name}`);
            if (key) element.setAttribute(name, translate(domLanguage, key));
        }
        const key = element.getAttribute('data-i18n-text');
        if (!key) continue;
        const node = [...element.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
        if (!node) continue;
        const english = originalText.get(node) ?? node.nodeValue;
        if (!originalText.has(node)) originalText.set(node, english);
        node.nodeValue = english.replace(english.trim(), translate(domLanguage, key));
    }
}

export function localizeDocument(language) {
    if (typeof document === 'undefined') return;
    domLanguage = language;
    translateMarkup(document.documentElement);
    if (!observer) {
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) translateMarkup(node);
                    else if (node.nodeType === Node.TEXT_NODE && node.parentElement?.hasAttribute('data-i18n-text')) {
                        translateMarkup(node.parentElement);
                    }
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
}

export function weekdayText(date, language) {
    const locale = { en: 'en-US', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', ja: 'ja-JP' }[language] || 'en-US';
    if (!weekdayFormatters.has(locale)) {
        weekdayFormatters.set(locale, new Intl.DateTimeFormat(locale, { weekday: 'short' }));
    }
    return `(${weekdayFormatters.get(locale).format(date)})`;
}

export const languageOptions = [
    { value: 'system', name: 'system' },
    { value: 'en', name: 'English' },
    { value: 'zh-Hans', name: '简体中文' },
    { value: 'zh-Hant', name: '繁體中文' },
    { value: 'ja', name: '日本語' },
];
