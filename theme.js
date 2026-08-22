(function () {
  'use strict';

  const STORAGE_KEY = 'malaib_theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  }

  function getEffectiveTheme() {
    return getSavedTheme() || (media.matches ? 'dark' : 'light');
  }

  function labels(theme) {
    const arabic = document.documentElement.lang === 'ar';
    if (theme === 'dark') {
      return arabic
        ? { label: 'الوضع الداكن مفعّل. التبديل إلى الوضع الفاتح', short: 'فاتح' }
        : { label: 'Dark mode is on. Switch to light mode', short: 'Light' };
    }
    return arabic
      ? { label: 'الوضع الفاتح مفعّل. التبديل إلى الوضع الداكن', short: 'داكن' }
      : { label: 'Light mode is on. Switch to dark mode', short: 'Dark' };
  }

  function updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#1e3a8a');
  }

  function updateButton(theme) {
    const button = document.getElementById('malaibThemeToggle');
    if (!button) return;
    const copy = labels(theme);
    button.innerHTML = `<span aria-hidden="true">${theme === 'dark' ? '☀️' : '🌙'}</span><span class="theme-toggle-label">${copy.short}</span>`;
    button.setAttribute('aria-label', copy.label);
    button.setAttribute('title', copy.label);
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    updateThemeColor(theme);
    updateButton(theme);
    window.dispatchEvent(new CustomEvent('malaibthemechange', { detail: { theme } }));
  }

  function createButton() {
    if (document.getElementById('malaibThemeToggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'malaibThemeToggle';
    button.className = 'malaib-theme-toggle';
    button.setAttribute('data-no-translate', 'true');
    button.addEventListener('click', () => {
      const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    });
    document.body.appendChild(button);
    updateButton(getEffectiveTheme());
    window.setTimeout(() => {
      button.classList.toggle('theme-toggle-solo', !document.getElementById('malaibLanguageSwitcher'));
    }, 0);
  }

  applyTheme(getEffectiveTheme());

  const handleSystemChange = () => {
    if (!getSavedTheme()) applyTheme(getEffectiveTheme());
  };
  if (typeof media.addEventListener === 'function') media.addEventListener('change', handleSystemChange);
  else if (typeof media.addListener === 'function') media.addListener(handleSystemChange);
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) applyTheme(getEffectiveTheme());
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createButton, { once: true });
  else createButton();

  window.MalaibTheme = {
    getTheme: getEffectiveTheme,
    setTheme(theme) {
      if (theme !== 'dark' && theme !== 'light') return;
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
    },
    useSystemTheme() {
      localStorage.removeItem(STORAGE_KEY);
      applyTheme(getEffectiveTheme());
    }
  };
})();
