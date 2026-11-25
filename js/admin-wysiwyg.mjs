// WYSIWYG-редактор: iframe с реальной страницей, редактирование текста на месте
import { getContent, saveContent } from './storage.mjs';

let currentSection = null;
let draftContent = null;
let frameDoc = null;
let frameReady = false;

// Карта: раздел -> { страница, контейнер, поля }
const sectionMap = {
  advantages: {
    page: 'index.html',
    container: '[data-content="advantages"] .benefit',
    fields: [
      { selector: 'h3', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  trust: {
    page: 'index.html',
    container: '[data-content="trust"] .trust-card',
    fields: [
      { selector: 'h3', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  partners: {
    page: 'index.html',
    container: '[data-content="partners"] .partner-logo',
    fields: [
      { selector: 'span', key: 'name' },
    ],
  },
  steps: {
    page: 'index.html',
    container: '[data-content="steps"] .step',
    fields: [
      { selector: 'h3', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  stats: {
    page: 'index.html',
    container: '[data-content="stats"] .stat',
    fields: [
      { selector: 'strong', key: 'value' },
      { selector: 'span', key: 'label' },
    ],
  },
  services: {
    page: 'services.html',
    container: '[data-content="services"] .service-card',
    fields: [
      { selector: 'h2', key: 'title' },
      { selector: 'p', key: 'description' },
    ],
  },
  gallery: {
    page: 'gallery.html',
    container: '.gallery-card',
    fields: [
      { selector: 'h3', key: 'title' },
      { selector: '.gallery-type', key: 'type' },
    ],
  },
  faq: {
    page: 'faq.html',
    container: '.faq-item',
    fields: [
      { selector: '[data-faq-question]', key: 'question' },
      { selector: '.faq-answer', key: 'answer' },
    ],
  },
  contacts: {
    page: 'contacts.html',
    container: '.contact-card',
    fields: [
      { selector: 'a[href^="tel"]', key: 'phone' },
      { selector: '[data-contact="hours"]', key: 'hours' },
      { selector: '[data-contact="address1"]', key: 'address1' },
      { selector: '[data-contact="address2"]', key: 'address2' },
    ],
  },
};

export function initWysiwygEditor() {
  const frame = document.getElementById('wysiwyg-frame');
  const saveBtn = document.getElementById('wysiwyg-save');
  const cancelBtn = document.getElementById('wysiwyg-cancel');
  const sectionNav = document.querySelector('[data-admin-sections]');
  const emptyState = document.getElementById('wysiwyg-empty');

  if (!frame) return;

  // Строим боковую навигацию
  buildSidebar(sectionNav);

  // Загрузка страницы в iframe
  frame.addEventListener('load', () => {
    frameDoc = frame.contentDocument || frame.contentWindow.document;
    if (!frameDoc) return;

    // Ждёт немного, чтобы Tilda-скрипты не мешали
    setTimeout(() => {
      prepareEditor();
      frameReady = true;
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      if (emptyState) emptyState.hidden = true;
    }, 600);
  });

  // Клик по разделу в навигации
  sectionNav?.addEventListener('click', (e) => {
    const link = e.target.closest('.wysiwyg-section-link');
    if (!link) return;

    const section = link.dataset.section;
    if (!section || !sectionMap[section]) return;

    currentSection = section;
    draftContent = JSON.parse(JSON.stringify(getContent()));
    frameReady = false;

    // Показываем iframe, скрываем заглушку
    if (frame) frame.hidden = false;
    if (emptyState) emptyState.hidden = true;

    // Загружаем страницу
    frame.src = sectionMap[section].page;
  });

  // Сохранение
  saveBtn?.addEventListener('click', () => {
    if (!frameDoc || !currentSection || !frameReady) return;
    collectContent();
    saveContent(draftContent);
    showToast(`Блок «${currentSection}» сохранён.`);
  });

  // Отмена
  cancelBtn?.addEventListener('click', () => {
    if (frame && currentSection && sectionMap[currentSection]) {
      frame.src = sectionMap[currentSection].page; // Перезагружаем
    }
  });
}

function buildSidebar(nav) {
  if (!nav) return;
  const labels = {
    advantages: '🌿 Преимущества',
    trust: '🛡️ Доверие',
    partners: '🤝 Партнёры',
    steps: '📋 Этапы',
    stats: '📊 Статистика',
    services: '🔧 Услуги',
    gallery: '🖼️ Галерея',
    faq: '❓ FAQ',
    contacts: '📍 Контакты',
  };

  Object.keys(sectionMap).forEach((key) => {
    const btn = document.createElement('button');
    btn.className = 'wysiwyg-section-link';
    btn.dataset.section = key;
    btn.type = 'button';
    btn.textContent = labels[key] || key;
    nav.appendChild(btn);
  });
}

function prepareEditor() {
  if (!frameDoc) return;

  // 1. Удаляем все скрипты, чтобы они не мешали
  frameDoc.querySelectorAll('script').forEach((s) => s.remove());

  // 2. Удаляем навигацию, футер, формы — оставляем только контент
  frameDoc.querySelectorAll('.nav-band, .footer, .modal-overlay, .backdrop, [class*="modal"], [class*="dialog"]').forEach((el) => {
    el.remove();
  });

  // 3. Скрываем всё, что не относится к текущему блоку
  const config = sectionMap[currentSection];
  if (!config) return;

  // Скрываем все секции
  frameDoc.querySelectorAll('section, .hero, [data-content]').forEach((el) => {
    // Показываем только контейнер текущего блока
    if (el === frameDoc.querySelector(config.container)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Также скрываем всё через querySelectorAll по контейнеру
  const mainContent = frameDoc.querySelector('main, .page-content, .content') || frameDoc.body;
  mainContent.querySelectorAll('*').forEach((el) => {
    // Показываем только элементы внутри контейнера и заголовки секций
    if (!el.closest(config.container) && !el.closest('.section-title') && el.tagName !== 'STYLE') {
      // Проверяем, не является ли элемент заголовком страницы
      if (!el.classList.contains('section-title') && !el.classList.contains('page-title')) {
        el.style.display = 'none';
      }
    }
  });

  // 4. Показываем контейнер и его содержимое
  const container = frameDoc.querySelector(config.container);
  if (container) {
    container.style.display = '';
    // Показываем всех родителей контейнера до main
    let parent = container.parentElement;
    while (parent && parent !== frameDoc.body) {
      if (parent.style) parent.style.display = '';
      parent = parent.parentElement;
    }
  }

  // 5. Добавляем стили для редактирования
  const existingStyle = frameDoc.querySelector('.wysiwyg-edit-styles');
  if (existingStyle) existingStyle.remove();

  const style = frameDoc.createElement('style');
  style.className = 'wysiwyg-edit-styles';
  style.textContent = `
    [contenteditable="true"] {
      outline: 2px dashed #66bb6a;
      outline-offset: 3px;
      border-radius: 4px;
      cursor: text;
      min-height: 1em;
      padding: 2px 4px;
    }
    [contenteditable="true"]:focus {
      outline: 2px solid #1b5e20;
      background: #f1f8e9;
    }
    [contenteditable="true"]:hover {
      outline: 2px dashed #a5d6a7;
    }
    /* Скрываем неконтекстные элементы */
    .wysiwyg-hide { display: none !important; }
    /* Убираем лишние отступы */
    body { max-width: 900px; margin: 0 auto; padding: 20px; }
  `;
  frameDoc.head.appendChild(style);

  // 6. Скрываем всё что вне контейнера
  frameDoc.querySelectorAll('*').forEach((el) => {
    if (el.tagName === 'STYLE' && el.classList.contains('wysiwyg-edit-styles')) return;
    if (!el.closest(config.container) && !el.closest('head')) {
      el.classList.add('wysiwyg-hide');
    }
  });

  // Показываем контейнер
  if (container) {
    container.classList.remove('wysiwyg-hide');
    container.style.display = '';
  }

  // 7. Делаем элементы редактируемыми
  makeEditable();
}

function makeEditable() {
  if (!frameDoc || !currentSection) return;
  const config = sectionMap[currentSection];
  if (!config) return;

  const content = draftContent[currentSection];
  if (!Array.isArray(content)) return;

  const items = frameDoc.querySelectorAll(config.container);
  items.forEach((item, index) => {
    if (!content[index]) return;
    config.fields.forEach((field) => {
      const el = item.querySelector(field.selector);
      if (el) {
        el.setAttribute('contenteditable', 'true');
        el.dataset.editKey = field.key;
        el.dataset.editIndex = String(index);
      }
    });
  });
}

function collectContent() {
  if (!frameDoc || !currentSection) return;
  const config = sectionMap[currentSection];
  if (!config) return;

  const items = frameDoc.querySelectorAll(config.container);
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

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
