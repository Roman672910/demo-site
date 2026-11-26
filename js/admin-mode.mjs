// Inline Admin Mode — Ctrl+Shift+A → пароль → редактирование на странице
import { getContent, saveContent, ADMIN_PASSWORD } from './storage.mjs';

let isActive = false;
let draftContent = null;
let currentSection = null;

// Карта: ключ → { контейнер, item-селектор, поля }
const sectionMap = {
  advantages: {
    container: '[data-content="advantages"]',
    itemSelector: '.benefit',
    fields: [
      { selector: 'h3', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  trust: {
    container: '[data-content="trust"]',
    itemSelector: '.trust-card',
    fields: [
      { selector: 'h3', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  partners: {
    container: '[data-content="partners"]',
    itemSelector: '.partner-logo',
    fields: [
      { selector: 'span', key: 'name' },
    ],
  },
  steps: {
    container: '[data-content="steps"]',
    itemSelector: '.step',
    fields: [
      { selector: 'h3', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  services: {
    container: '[data-content="services"]',
    itemSelector: '.service-card',
    fields: [
      { selector: 'h2', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  faq: {
    container: '.faq-list',
    itemSelector: '.faq-item',
    fields: [
      { selector: '[data-faq-question] span', key: 'question' },
      { selector: '.faq-answer', key: 'answer' },
    ],
  },
  contacts: {
    container: '.contact-cards',
    itemSelector: '.contact-card',
    fields: [
      { selector: 'a[href^="tel"]', key: 'phone' },
      { selector: '[data-contact="hours"]', key: 'hours' },
      { selector: '[data-contact="address1"]', key: 'address1' },
      { selector: '[data-contact="address2"]', key: 'address2' },
    ],
  },
};

const sectionLabels = {
  advantages: 'Преимущества',
  trust: 'Доверие',
  partners: 'Партнёры',
  steps: 'Этапы',
  services: 'Услуги',
  faq: 'FAQ',
  contacts: 'Контакты',
};

// Запуск пароля
function showPasswordDialog() {
  if (isActive) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'admin-password-overlay';
  overlay.innerHTML = `
    <div class="admin-password-box">
      <h3>🔐 Админ-режим</h3>
      <input type="password" id="admin-pass-input" placeholder="Введите пароль" autofocus />
      <p class="admin-pass-error" id="admin-pass-error" hidden>Неверный пароль</p>
      <div class="admin-pass-actions">
        <button class="admin-pass-btn admin-pass-btn--ok" id="admin-pass-ok">Войти</button>
        <button class="admin-pass-btn admin-pass-btn--cancel" id="admin-pass-cancel">Отмена</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#admin-pass-input');
  const error = overlay.querySelector('#admin-pass-error');
  const okBtn = overlay.querySelector('#admin-pass-ok');
  const cancelBtn = overlay.querySelector('#admin-pass-cancel');

  function close() { overlay.remove(); }

  function tryLogin() {
    if (input.value === ADMIN_PASSWORD) {
      close();
      enterAdminMode();
    } else {
      error.hidden = false;
      input.value = '';
      input.focus();
    }
  }

  okBtn.addEventListener('click', tryLogin);
  cancelBtn.addEventListener('click', close);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryLogin();
    if (e.key === 'Escape') close();
  });

  setTimeout(() => input.focus(), 50);
}

// Вход в админ-режим
function enterAdminMode() {
  isActive = true;
  document.body.classList.add('admin-mode');
  
  // Запоминаем текущие данные
  draftContent = JSON.parse(JSON.stringify(getContent()));
  
  // Показываем тулбар
  showToolbar();
  
  // Подсвечиваем все секции
  highlightAllSections();
}

// Выход из админ-режима
function exitAdminMode() {
  isActive = false;
  currentSection = null;
  document.body.classList.remove('admin-mode');
  document.querySelectorAll('.admin-toolbar').forEach((t) => t.remove());
  document.querySelectorAll('.admin-section-hint').forEach((h) => h.remove());
  
  // Показываем все секции
  document.querySelectorAll('[data-content]').forEach((el) => {
    el.style.display = '';
  });
  
  // Убираем подсветку
  document.querySelectorAll('[data-admin-editable]').forEach((el) => {
    el.removeAttribute('data-admin-editable');
  });
}

// Сохранение
function saveChanges() {
  if (!currentSection) return;
  collectEdits();
  saveContent(draftContent);
  showToast(`Блок «${sectionLabels[currentSection]}» сохранён!`);
}

// Показать тулбар
function showToolbar() {
  document.querySelectorAll('.admin-toolbar').forEach((t) => t.remove());
  
  const toolbar = document.createElement('div');
  toolbar.className = 'admin-toolbar';
  
  let navHtml = '<div class="admin-toolbar-nav">';
  Object.keys(sectionMap).forEach((key) => {
    const isActive = key === currentSection ? ' active' : '';
    navHtml += `<button class="admin-toolbar-section${isActive}" data-section="${key}">${sectionLabels[key]}</button>`;
  });
  navHtml += '</div>';
  
  toolbar.innerHTML = `
    <div class="admin-toolbar-left">
      <span class="admin-toolbar-badge">✏️ Админ-режим</span>
      ${navHtml}
    </div>
    <div class="admin-toolbar-actions">
      <button class="admin-toolbar-btn admin-toolbar-btn--save" id="admin-save-btn">💾 Сохранить</button>
      <button class="admin-toolbar-btn admin-toolbar-btn--exit" id="admin-exit-btn">✕ Выйти</button>
    </div>
  `;
  
  document.body.appendChild(toolbar);
  
  // Навигация
  toolbar.querySelectorAll('.admin-toolbar-section').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (!sectionMap[section]) return;
      currentSection = section;
      
      // Обновляем активную кнопку
      toolbar.querySelectorAll('.admin-toolbar-section').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      
      highlightSection();
    });
  });
  
  // Сохранить
  document.getElementById('admin-save-btn')?.addEventListener('click', saveChanges);
  
  // Выйти
  document.getElementById('admin-exit-btn')?.addEventListener('click', exitAdminMode);
}

// Подсветка всех секций (вход в режим)
function highlightAllSections() {
  document.querySelectorAll('[data-admin-editable]').forEach((el) => {
    el.removeAttribute('data-admin-editable');
    el.removeAttribute('contenteditable');
  });
  
  document.querySelectorAll('.admin-section-hint').forEach((h) => h.remove());
  
  // Подсвечиваем все секции
  Object.keys(sectionMap).forEach((key) => {
    const config = sectionMap[key];
    const container = document.querySelector(config.container);
    if (!container) return;
    
    const items = container.querySelectorAll(config.itemSelector);
    const content = draftContent[key] || [];
    
    items.forEach((item, index) => {
      if (!content[index]) return;
      item.setAttribute('data-admin-editable', 'true');
      
      config.fields.forEach((field) => {
        const el = item.querySelector(field.selector);
        if (el) {
          el.setAttribute('contenteditable', 'true');
          el.dataset.editKey = field.key;
          el.dataset.editIndex = String(index);
        }
      });
    });
  });
  
  // По умолчанию выбираем первую секцию
  const firstKey = Object.keys(sectionMap)[0];
  currentSection = firstKey;
  highlightSection();
}

// Подсветка одной секции
function highlightSection() {
  // Убираем старую
  document.querySelectorAll('[data-admin-editable]').forEach((el) => {
    el.removeAttribute('data-admin-editable');
    el.removeAttribute('contenteditable');
    el.style.display = '';
  });
  
  document.querySelectorAll('.admin-section-hint').forEach((h) => h.remove());
  
  // Скрываем все секции
  document.querySelectorAll('[data-content]').forEach((el) => {
    el.style.display = 'none';
  });
  
  // Показываем только текущую
  const config = sectionMap[currentSection];
  const container = document.querySelector(config.container);
  if (!container) return;
  
  container.style.display = '';
  
  // Показываем родителей контейнера
  let parent = container.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    parent.style.display = '';
    parent = parent.parentElement;
  }
  
  // Подсвечиваем элементы
  const items = container.querySelectorAll(config.itemSelector);
  const content = draftContent[currentSection] || [];
  
  items.forEach((item, index) => {
    if (!content[index]) return;
    item.setAttribute('data-admin-editable', 'true');
    
    config.fields.forEach((field) => {
      const el = item.querySelector(field.selector);
      if (el) {
        el.setAttribute('contenteditable', 'true');
        el.dataset.editKey = field.key;
        el.dataset.editIndex = String(index);
      }
    });
  });
  
  // Подсказка
  const hint = document.createElement('div');
  hint.className = 'admin-section-hint';
  hint.textContent = `📝 Редактирование: ${sectionLabels[currentSection]}`;
  container.parentElement.insertBefore(hint, container);
}

// Сбор изменений
function collectEdits() {
  if (!currentSection || !draftContent[currentSection]) return;
  
  const config = sectionMap[currentSection];
  const container = document.querySelector(config.container);
  if (!container) return;
  
  const items = container.querySelectorAll(config.itemSelector);
  
  items.forEach((item) => {
    const index = parseInt(item.dataset.editIndex);
    if (isNaN(index) || !draftContent[currentSection][index]) return;
    
    config.fields.forEach((field) => {
      const el = item.querySelector(field.selector);
      if (el) {
        draftContent[currentSection][index][field.key] = el.textContent.trim();
      }
    });
  });
}

// Toast
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Горячие клавиши
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    showPasswordDialog();
  }
});

// Экспорт
export function isAdminActive() {
  return isActive;
}

export function initAdminMode() {
  // Инициализировано через keydown listener
}
