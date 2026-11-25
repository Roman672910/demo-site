// ВНИМАНИЕ: пароль в клиентском JS — только демонстрационный барьер, не безопасность.
import { ADMIN_PASSWORD, exportData, importData, resetAll } from './storage.mjs';
import { initDialogs, closeDialog } from './ui.mjs';
import { initAdminCrud } from './admin-crud.mjs';
import { initWysiwygEditor } from './admin-wysiwyg.mjs';

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
  document.getElementById('export-json').addEventListener('click', () => {
    const blob = new Blob([exportData()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mosregseptik-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Резервная копия JSON подготовлена.');
  });
  const importInput = document.getElementById('import-json');
  document
    .getElementById('import-json-button')
    .addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Файл слишком большой: максимум 5 МБ.');
      const json = await file.text();
      // Сначала проверяем формат, затем спрашиваем подтверждение замены.
      const parsed = JSON.parse(json);
      if (parsed?.version !== 1 || !Array.isArray(parsed.products) || !parsed.content)
        throw new Error('Нужна резервная копия МОСРЕГСЕПТИК версии 1.');
      if (!confirm(`Заменить все товары (${parsed.products.length}) и контент данными из файла?`))
        return;
      const result = importData(json);
      if (!result.ok) throw new Error(result.error);
      location.reload();
    } catch (exception) {
      notify(`Импорт отменён: ${exception.message}`, true);
    } finally {
      importInput.value = '';
    }
  });
  document.getElementById('reset-all').addEventListener('click', () => {
    document.getElementById('reset-dialog').showModal();
    document.body.classList.add('modal-open');
  });
  document.getElementById('confirm-reset').addEventListener('click', () => {
    try {
      resetAll();
      closeDialog(document.getElementById('reset-dialog'));
      location.reload();
    } catch (exception) {
      notify(exception.message, true);
    }
  });
  if (isAuthenticated()) showDashboard();
  else password.focus();
}
initAdmin();
