// Управление бэкапами: история, восстановление, экспорт/импорт
import { exportData, importData, resetAll } from './storage.mjs';

const BACKUPS_KEY = 'mosregseptik.backups';
const MAX_BACKUPS = 20;

function getBackups() {
  try {
    const raw = localStorage.getItem(BACKUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveBackups(backups) {
  try {
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
  } catch { /* ignore */ }
}
function createBackup() {
  const backups = getBackups();
  const snapshot = {
    id: `bkp-${Date.now()}`,
    exportedAt: new Date().toISOString(),
    data: exportData(),
  };
  backups.unshift(snapshot);
  while (backups.length > MAX_BACKUPS) backups.pop();
  saveBackups(backups);
  return snapshot;
}

export function initBackupsPanel() {
  const list = document.getElementById('backups-list');
  if (!list) return;

  const exportBtn = document.getElementById('export-json');
  const importBtn = document.getElementById('import-json-button');
  const importInput = document.getElementById('import-json');
  const resetBtn = document.getElementById('reset-all');

  if (exportBtn) exportBtn.addEventListener('click', handleExport);
  if (importBtn) importBtn.addEventListener('click', () => importInput.click());
  if (importInput) importInput.addEventListener('change', handleImport);
  if (resetBtn) resetBtn.addEventListener('click', () => {
    document.getElementById('reset-dialog').showModal();
    document.body.classList.add('modal-open');
  });

  renderBackupsList();
}

function handleExport() {
  createBackup();
  const blob = new Blob([exportData()], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mosregseptik-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  renderBackupsList();
  showToast('Бэкап создан и экспортирован.');
}

async function handleImport() {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Файл слишком большой: максимум 5 МБ.');
    const json = await file.text();
    const parsed = JSON.parse(json);
    if (parsed?.version !== 1 || !Array.isArray(parsed.products) || !parsed.content)
      throw new Error('Нужна резервная копия МОСРЕГСЕПТИК версии 1.');
    if (!confirm(`Заменить все данные (${parsed.products.length} товаров) данными из файла?`)) return;
    const result = importData(json);
    if (!result.ok) throw new Error(result.error);
    createBackup();
    location.reload();
  } catch (exception) {
    showToast(`Импорт отменён: ${exception.message}`, true);
  } finally {
    importInput.value = '';
  }
}

function renderBackupsList() {
  const list = document.getElementById('backups-list');
  if (!list) return;
  const backups = getBackups();

  if (!backups.length) {
    list.innerHTML = '<p class="backups-empty">Нет сохранённых бэкапов. Нажмите «Экспорт JSON» для создания.</p>';
    return;
  }

  list.innerHTML = backups.map((bk, i) => {
    const date = new Date(bk.exportedAt);
    const dateStr = date.toLocaleDateString('ru-RU');
    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const size = (bk.data.length / 1024).toFixed(1);
    const products = JSON.parse(bk.data)?.products?.length || 0;
    return `
      <div class="backup-item">
        <div class="backup-info">
          <strong>Бэкап #${i + 1}</strong>
          <span class="backup-meta">${dateStr} ${timeStr} · ${size} КБ · ${products} товаров</span>
        </div>
        <div class="backup-actions">
          <button class="btn btn--outline btn--tiny" type="button" data-restore-backup="${bk.id}" data-index="${i}">Восстановить</button>
          <button class="btn btn--outline btn--tiny btn--danger" type="button" data-delete-backup="${bk.id}" data-index="${i}">Удалить</button>
        </div>
      </div>`;
  }).join('');

  // Привязка событий
  list.querySelectorAll('[data-restore-backup]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const backups = getBackups();
      if (!backups[idx]) return;
      if (!confirm('Восстановить данные из этого бэкапа? Текущие данные будут сохранены как новый бэкап.')) return;
      try {
        createBackup();
        const result = importData(backups[idx].data);
        if (!result.ok) throw new Error(result.error);
        location.reload();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  list.querySelectorAll('[data-delete-backup]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const backups = getBackups();
      if (!backups[idx]) return;
      if (!confirm('Удалить этот бэкап?')) return;
      backups.splice(idx, 1);
      saveBackups(backups);
      renderBackupsList();
      showToast('Бэкап удалён.');
    });
  });
}

function showToast(message, error = false) {
  const region = document.querySelector('[data-toast-region]');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast${error ? ' toast--error' : ''}`;
  toast.textContent = message;
  region.append(toast);
  setTimeout(() => toast.remove(), 3000);
}
