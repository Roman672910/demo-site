// ВНИМАНИЕ: пароль в клиентском JS — только демонстрационный барьер, не безопасность.
import { ADMIN_PASSWORD, exportData, importData, resetAll } from './storage.mjs';
import { initDialogs, closeDialog } from './ui.mjs';
import { initAdminCrud } from './admin-crud.mjs';
import { initWysiwygEditor } from './admin-wysiwyg.mjs';
import { initHeroSeoEditor } from './admin-hero-seo.mjs';
import { initSettingsEditor } from './admin-settings.mjs';
import { initBackupsPanel } from './admin-backups.mjs';

const SESSION_KEY = 'mosregseptik.admin.demo-session';
let sessionFallback = false;
function isAuthenticated() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1' || sessionFallback;
  } catch {
    return sessionFallback;
  }
}
function notify(message, error = false) {
  const region = document.querySelector('[data-toast-region]');
  const toast = document.createElement('div');
  toast.className = `toast${error ? ' toast--error' : ''}`;
  toast.textContent = message;
  region.append(toast);
  setTimeout(() => toast.remove(), 3000);
}
function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function activate(tab) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      item.classList.toggle('active', active);
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activate(tabs[next]);
      tabs[next].focus();
    });
  });
  activate(tabs[0]);
}
export function initAdmin() {
  initDialogs();
  const login = document.getElementById('admin-login');
  const dashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('admin-login-form');
  const password = document.getElementById('admin-password');
  const error = document.getElementById('admin-login-error');
  let crud = null;
  function showDashboard() {
    login.hidden = true;
    dashboard.hidden = false;
    if (!crud) {
      crud = initAdminCrud({ notify });
      initTabs();
      initWysiwygEditor();
      initHeroSeoEditor();
      initSettingsEditor();
      initBackupsPanel();
    } else crud.refresh();
  }
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (password.value !== ADMIN_PASSWORD) {
      error.textContent = 'Неверный пароль. Для демоверсии используйте mosregseptik2024.';
      error.hidden = false;
      password.setAttribute('aria-invalid', 'true');
      password.focus();
      return;
    }
    sessionFallback = true;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* Флаг только в памяти вкладки. */
    }
    password.value = '';
    error.hidden = true;
    password.removeAttribute('aria-invalid');
    showDashboard();
    notify('Вы вошли в демонстрационную админ-панель.');
  });
  document.getElementById('admin-logout').addEventListener('click', () => {
    if (crud && !crud.mayLeaveEditor()) return;
    sessionFallback = false;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Память уже очищена. */
    }
    dashboard.hidden = true;
    login.hidden = false;
    password.focus();
    notify('Вы вышли из админ-панели.');
  });
  if (isAuthenticated()) showDashboard();
  else password.focus();
}
initAdmin();
