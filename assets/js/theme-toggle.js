/* ─────────────────────────────
   THEME TOGGLE
   ─────────────────────────────

   Light/dark mode via data-theme="dark" on <html>.
   Persists the choice to localStorage('dark-mode');
   OS preference is the default when no choice is stored.

   Load this script in <head> (no defer): the attribute is set at
   parse time, before first paint, so there is no theme flash.
   Icons are injected into every empty .dark-mode-toggle button.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';
  var STORAGE_KEY = 'dark-mode';

  var ICON_SUN = '<svg data-icon="sun" aria-hidden="true" width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M11 5V1H13V5H11ZM17.65 7.75L16.275 6.375L19.075 3.5L20.475 4.925L17.65 7.75ZM19 13V11H23V13H19ZM11 23V19H13V23H11ZM6.35 7.7L3.5 4.925L4.925 3.525L7.75 6.35L6.35 7.7ZM19.05 20.5L16.275 17.625L17.625 16.275L20.475 19.025L19.05 20.5ZM1 13V11H5V13H1ZM4.925 20.5L3.525 19.075L6.325 16.275L7.05 16.95L7.775 17.65L4.925 20.5ZM12 18C10.3333 18 8.91667 17.4167 7.75 16.25C6.58333 15.0833 6 13.6667 6 12C6 10.3333 6.58333 8.91667 7.75 7.75C8.91667 6.58333 10.3333 6 12 6C13.6667 6 15.0833 6.58333 16.25 7.75C17.4167 8.91667 18 10.3333 18 12C18 13.6667 17.4167 15.0833 16.25 16.25C15.0833 17.4167 13.6667 18 12 18ZM12 16C13.1 16 14.0417 15.6083 14.825 14.825C15.6083 14.0417 16 13.1 16 12C16 10.9 15.6083 9.95833 14.825 9.175C14.0417 8.39167 13.1 8 12 8C10.9 8 9.95833 8.39167 9.175 9.175C8.39167 9.95833 8 10.9 8 12C8 13.1 8.39167 14.0417 9.175 14.825C9.95833 15.6083 10.9 16 12 16Z" fill="currentColor"/></svg>';
  var ICON_MOON = '<svg data-icon="moon" aria-hidden="true" viewBox="0 0 24 24" fill="none" width="100%" height="100%"><path d="M15.1625 17.6625C16.7208 16.1042 17.5 14.2167 17.5 12C17.5 9.78333 16.7208 7.89583 15.1625 6.3375C13.9817 5.15672 12.1597 4.35602 10.402 4.10029C9.60391 3.98418 9.20482 4.89906 9.63374 5.58204C10.0596 6.26022 10.4192 6.97871 10.7125 7.7375C11.2375 9.09583 11.5 10.5167 11.5 12C11.5 13.4833 11.2375 14.9042 10.7125 16.2625C10.4462 16.9516 10.1252 17.6074 9.74945 18.23C9.31198 18.955 9.78479 19.9392 10.6206 19.8035C12.371 19.5193 14.0025 18.8225 15.1625 17.6625ZM9.5 22C8.61667 22 7.75417 21.8875 6.9125 21.6625C6.07083 21.4375 5.26667 21.1 4.5 20.65C6.05 19.75 7.27083 18.5333 8.1625 17C9.05417 15.4667 9.5 13.8 9.5 12C9.5 10.2 9.05417 8.53333 8.1625 7C7.27083 5.46667 6.05 4.25 4.5 3.35C5.26667 2.9 6.07083 2.5625 6.9125 2.3375C7.75417 2.1125 8.61667 2 9.5 2C10.8833 2 12.1833 2.2625 13.4 2.7875C14.6167 3.3125 15.675 4.025 16.575 4.925C17.475 5.825 18.1875 6.88333 18.7125 8.1C19.2375 9.31667 19.5 10.6167 19.5 12C19.5 13.3833 19.2375 14.6833 18.7125 15.9C18.1875 17.1167 17.475 18.175 16.575 19.075C15.675 19.975 14.6167 20.6875 13.4 21.2125C12.1833 21.7375 10.8833 22 9.5 22Z" fill="currentColor"/></svg>';

  function applyStoredTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) { /* storage unavailable — fall back to OS preference */ }

    if (saved === 'true' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function handleToggleClick(event) {
    var toggle = event.target.closest('.dark-mode-toggle');
    if (!toggle) return;

    var root = document.documentElement;
    var isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', 'dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(!isDark));
    } catch (e) { /* storage unavailable — theme still toggles for this page */ }
  }

  function injectToggleIcons() {
    var toggles = document.querySelectorAll('.dark-mode-toggle');
    toggles.forEach(function (toggle) {
      if (toggle.childElementCount > 0) return;
      toggle.innerHTML =
        '<span class="svg-icn dark-mode-icon-light">' + ICON_SUN + '</span>' +
        '<span class="svg-icn dark-mode-icon-dark">' + ICON_MOON + '</span>';
    });
  }

  function initThemeToggle() {
    applyStoredTheme();
    document.addEventListener('click', handleToggleClick);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectToggleIcons);
    } else {
      injectToggleIcons();
    }
    console.log('theme-toggle.js v' + VERSION + ' initialised');
  }

  initThemeToggle();
})();
