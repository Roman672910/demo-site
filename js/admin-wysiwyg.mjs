// Форм-редактор контента: слева навигация, справа карточки с полями
import { getContent, saveContent } from './storage.mjs';

let currentSection = null;
let draftContent = null;
let dragSrcIndex = null;

// Карта: раздел -> { заголовок, поля }
const sectionConfig = {
  advantages: {
    title: 'Преимущества',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'icon', label: 'Иконка', type: 'icon' },
    ],
    newItem: () => ({ id: uid(), title: 'Новое преимущество', description: 'Опишите преимущество', icon: 'leaf' }),
  },
  trust: {
    title: 'Доверие',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'icon', label: 'Иконка', type: 'icon' },
    ],
    newItem: () => ({ id: uid(), title: 'Новый пункт', description: 'Опишите пункт', icon: 'leaf' }),
  },
  partners: {
    title: 'Партнёры',
    fields: [
      { key: 'name', label: 'Название', type: 'text' },
    ],
    newItem: () => ({ id: uid(), name: 'Новый партнёр' }),
  },
  steps: {
    title: 'Этапы',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
    newItem: () => ({ id: uid(), title: 'Новый этап', description: 'Опишите этап' }),
  },
  stats: {
    title: 'Статистика',
    fields: [
      { key: 'value', label: 'Значение', type: 'text' },
      { key: 'label', label: 'Подпись', type: 'text' },
    ],
    newItem: () => ({ id: uid(), value: '0', label: 'Новый показатель' }),
  },
  services: {
    title: 'Услуги',
    fields: [
      { key: 'title', label: 'Название', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'price', label: 'Цена от, ₽', type: 'number' },
      { key: 'icon', label: 'Иконка', type: 'icon' },
    ],
    newItem: () => ({ id: uid(), title: 'Новая услуга', description: 'Опишите услугу', price: 0, icon: 'leaf' }),
  },
  gallery: {
    title: 'Галерея',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'type', label: 'Тип работ', type: 'text' },
      { key: 'image', label: 'URL изображения', type: 'image' },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
    newItem: () => ({ id: uid(), title: 'Новая работа', type: 'Монтаж', image: '', description: '' }),
  },
  faq: {
    title: 'FAQ',
    fields: [
      { key: 'question', label: 'Вопрос', type: 'text' },
      { key: 'answer', label: 'Ответ', type: 'textarea' },
    ],
    newItem: () => ({ id: uid(), question: 'Новый вопрос?', answer: 'Новый ответ' }),
  },
  contacts: {
    title: 'Контакты',
    fields: [
      { key: 'address1', label: 'Адрес в Москве', type: 'text' },
      { key: 'address2', label: 'Адрес в МО', type: 'text' },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'hours', label: 'Часы работы', type: 'text' },
    ],
    isContact: true,
    newItem: null,
  },
  navigation: {
    title: 'Навигация',
    fields: [
      { key: 'text', label: 'Текст', type: 'text' },
      { key: 'href', label: 'Ссылка', type: 'text' },
    ],
    newItem: () => ({ id: uid(), text: 'Новая ссылка', href: '#' }),
    isSingle: false,
  },
  footer: {
    title: 'Footer',
    fields: [
      { key: 'copyright', label: 'Копирайт', type: 'text' },
      { key: 'privacyLabel', label: 'Метка политики', type: 'text' },
      { key: 'disclaimer', label: 'Дисклеймер', type: 'text' },
      { key: 'aboutText', label: 'Текст о компании', type: 'textarea' },
      { key: 'ctaText', label: 'Текст CTA', type: 'text' },
    ],
    newItem: null,
    isSingle: true,
  },
  hero: {
    title: 'Hero-секция',
    fields: [
      { key: 'epigraph', label: 'Подзаголовок (eyebrow)', type: 'text' },
      { key: 'title', label: 'Заголовок (H1)', type: 'textarea' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'stickerText', label: 'Стикер — текст', type: 'text' },
      { key: 'stickerSubtext', label: 'Стикер — подтекст', type: 'text' },
    ],
    newItem: null,
    isSingle: true,
    isHero: true,
  },
};

const icons = ['clock', 'shield', 'truck', 'file', 'wallet', 'users', 'settings', 'check', 'leaf'];
const iconLabels = {
  clock: '🕐 Часы', shield: '🛡️ Щит', truck: '🚚 Грузовик', file: '📄 Файл',
  wallet: '💰 Кошелёк', users: '👥 Люди', settings: '⚙️ Шестерёнка', check: '✅ Галочка', leaf: '🍃 Лист',
};

const uid = () => globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function initWysiwygEditor() {
  const saveBtn = document.getElementById('content-save');
  const cancelBtn = document.getElementById('content-cancel');
  const sectionNav = document.querySelector('[data-admin-sections]');
  const editorArea = document.getElementById('content-editor-area');

  if (!sectionNav) return;

  // Строим боковую навигацию
  Object.keys(sectionConfig).forEach((key) => {
    const btn = document.createElement('button');
    btn.className = 'content-section-link';
    btn.dataset.section = key;
    btn.type = 'button';
    btn.textContent = sectionConfig[key].title;
    sectionNav.appendChild(btn);
  });

  // Клик по разделу
  sectionNav.addEventListener('click', (e) => {
    const link = e.target.closest('.content-section-link');
    if (!link) return;

    const section = link.dataset.section;
    if (!sectionConfig[section]) return;

    currentSection = section;
    draftContent = JSON.parse(JSON.stringify(getContent()));

    // Активная кнопка
    sectionNav.querySelectorAll('.content-section-link').forEach((b) => b.classList.remove('active'));
    link.classList.add('active');

    renderEditor();
    saveBtn.disabled = false;
    cancelBtn.disabled = false;
  });

  // Сохранение
  saveBtn?.addEventListener('click', () => {
    if (!currentSection) return;
    // Для hero и footer уже сохранили в draftContent через input-события
    saveContent(draftContent);
    showToast(`Блок «${sectionConfig[currentSection].title}» сохранён.`);
  });

  // Отмена
  cancelBtn?.addEventListener('click', () => {
    if (currentSection) {
      draftContent = JSON.parse(JSON.stringify(getContent()));
      renderEditor();
    }
  });
}

function renderEditor() {
  const area = document.getElementById('content-editor-area');
  if (!area || !currentSection) return;

  const config = sectionConfig[currentSection];
  if (!config) return;

  const content = draftContent[currentSection];
  const isContact = config.isContact;
  const isSingle = config.isSingle;
  const isHero = config.isHero;

  let html = `<h3>${config.title}</h3>`;

  if (isContact) {
    // Контакты — однострочные поля
    html += '<div class="content-fields">';
    config.fields.forEach((field) => {
      const val = content?.[field.key] || '';
      html += `
        <div class="field">
          <label for="ce-${field.key}">${field.label}</label>
          <input id="ce-${field.key}" data-key="${field.key}" type="${field.type}" value="${escapeHtml(val)}" />
        </div>`;
    });
    html += '</div>';
  } else if (isSingle) {
    // Одиночные блоки (hero, footer)
    html += '<div class="content-fields content-fields--wide">';
    config.fields.forEach((field) => {
      const val = content?.[field.key] ?? '';
      if (field.type === 'textarea') {
        html += `
          <div class="field">
            <label for="ce-${field.key}">${field.label}</label>
            <textarea id="ce-${field.key}" data-key="${field.key}" rows="3">${escapeHtml(val)}</textarea>
          </div>`;
      } else {
        html += `
          <div class="field">
            <label for="ce-${field.key}">${field.label}</label>
            <input id="ce-${field.key}" data-key="${field.key}" type="${field.type}" value="${escapeHtml(val)}" />
          </div>`;
      }
    });
    html += '</div>';
  } else if (isHero) {
    // Hero-секция — расширенный редактор
    const h = content;
    const cp = h.ctaPrimary || { text: '', href: '' };
    const cs = h.ctaSecondary || { text: '', href: '' };
    html += '<div class="content-fields content-fields--wide">';
    html += `
      <div class="field">
        <label for="ce-epigraph">Подзаголовок (eyebrow)</label>
        <input id="ce-epigraph" data-key="epigraph" type="text" value="${escapeHtml(h.epigraph || '')}" />
      </div>
      <div class="field">
        <label for="ce-title">Заголовок H1 (поддерживает HTML)</label>
        <textarea id="ce-title" data-key="title" rows="3">${escapeHtml(h.title || '')}</textarea>
      </div>
      <div class="field">
        <label for="ce-description">Описание</label>
        <textarea id="ce-description" data-key="description" rows="3">${escapeHtml(h.description || '')}</textarea>
      </div>
      <div class="content-fields--two">
        <div class="field">
          <label>CTA — основная кнопка</label>
          <input id="ce-ctaPrimaryText" data-key="ctaPrimaryText" type="text" value="${escapeHtml(cp.text)}" placeholder="Текст кнопки" />
          <input id="ce-ctaPrimaryHref" data-key="ctaPrimaryHref" type="text" value="${escapeHtml(cp.href)}" placeholder="#/ссылка" />
        </div>
        <div class="field">
          <label>CTA — вторичная кнопка</label>
          <input id="ce-ctaSecondaryText" data-key="ctaSecondaryText" type="text" value="${escapeHtml(cs.text)}" placeholder="Текст кнопки" />
          <input id="ce-ctaSecondaryHref" data-key="ctaSecondaryHref" type="text" value="${escapeHtml(cs.href)}" placeholder="#/ссылка" />
        </div>
      </div>
      <div class="content-fields--two">
        <div class="field">
          <label>Стикер — текст</label>
          <input id="ce-stickerText" data-key="stickerText" type="text" value="${escapeHtml(h.stickerText || '')}" />
        </div>
        <div class="field">
          <label>Стикер — подтекст</label>
          <input id="ce-stickerSubtext" data-key="stickerSubtext" type="text" value="${escapeHtml(h.stickerSubtext || '')}" />
        </div>
      </div>
    `;
    html += '</div>';
  } else {
    // Обычные блоки — карточки с drag-and-drop
    html += '<div class="content-items">';
    content.forEach((item, index) => {
      html += `
        <div class="content-card" data-index="${index}" draggable="true">
          <div class="content-card-header">
            <span class="content-card-drag-handle" title="Перетащите для сортировки">⠿</span>
            <span>${index + 1}. ${getItemTitle(item, config)}</span>
            <div class="content-card-actions">
              <button class="btn btn--outline btn--tiny" type="button" data-move-up="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button class="btn btn--outline btn--tiny" type="button" data-move-down="${index}" ${index === content.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="btn btn--outline btn--tiny btn--danger" type="button" data-remove="${index}">✕</button>
            </div>
          </div>
          <div class="content-fields">`;

      config.fields.forEach((field) => {
        const val = item[field.key] ?? '';
        if (field.type === 'textarea') {
          html += `
            <div class="field">
              <label for="ce-${currentSection}-${field.key}-${index}">${field.label}</label>
              <textarea id="ce-${currentSection}-${field.key}-${index}" data-key="${field.key}" data-index="${index}" rows="2">${escapeHtml(val)}</textarea>
            </div>`;
        } else if (field.type === 'icon') {
          html += renderIconSelect(currentSection, index, field.key, val);
        } else if (field.type === 'image') {
          html += `
            <div class="field">
              <label for="ce-${currentSection}-${field.key}-${index}">${field.label}</label>
              <input id="ce-${currentSection}-${field.key}-${index}" data-key="${field.key}" data-index="${index}" type="text" value="${escapeHtml(val)}" placeholder="assets/images/..." />
              <div class="image-upload-row">
                <label class="image-upload-btn">
                  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Загрузить
                  <input type="file" accept="image/*" class="image-file-input" data-target="ce-${currentSection}-${field.key}-${index}" hidden />
                </label>
              </div>
            </div>`;
        } else {
          html += `
            <div class="field">
              <label for="ce-${currentSection}-${field.key}-${index}">${field.label}</label>
              <input id="ce-${currentSection}-${field.key}-${index}" data-key="${field.key}" data-index="${index}" type="${field.type}" value="${escapeHtml(val)}" />
            </div>`;
        }
      });

      html += '</div></div>';
    });
    html += '</div>';

    // Кнопка добавить
    html += `<button class="btn btn--outline" type="button" data-add-item>+ Добавить элемент</button>`;
  }

  area.innerHTML = html;

  // Привязываем события
  bindEditorEvents();
}

function renderIconSelect(section, index, key, value) {
  const currentIcon = value || 'leaf';
  let optionsHtml = icons.map((icon) =>
    `<div class="icon-opt" data-icon="${icon}">${iconLabels[icon] || icon}</div>`
  ).join('');

  return `
    <div class="field">
      <label>${sectionConfig[section].fields.find(f => f.key === key)?.label || key}</label>
      <div class="icon-picker" data-icon-picker>
        <div class="icon-picker-display" data-icon-display>${iconLabels[currentIcon] || currentIcon}</div>
        <div class="icon-picker-options" style="display:none">${optionsHtml}</div>
        <input type="hidden" data-key="${key}" data-index="${index}" value="${escapeHtml(currentIcon)}" />
      </div>
    </div>`;
}

function bindEditorEvents() {
  const area = document.getElementById('content-editor-area');
  if (!area) return;

  // Движение карточек
  area.addEventListener('click', (e) => {
    const upBtn = e.target.closest('[data-move-up]');
    const downBtn = e.target.closest('[data-move-down]');
    const removeBtn = e.target.closest('[data-remove]');
    const addBtn = e.target.closest('[data-add-item]');

    if (!upBtn && !downBtn && !removeBtn && !addBtn) return;
    e.preventDefault();

    if (addBtn) {
      const config = sectionConfig[currentSection];
      const content = draftContent[currentSection];
      content.push(config.newItem());
      renderEditor();
      return;
    }

    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.remove);
      if (confirm('Удалить этот элемент?')) {
        draftContent[currentSection].splice(idx, 1);
        renderEditor();
      }
      return;
    }

    if (upBtn) {
      const idx = parseInt(upBtn.dataset.moveUp);
      if (idx > 0) {
        const arr = draftContent[currentSection];
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        renderEditor();
      }
      return;
    }

    if (downBtn) {
      const idx = parseInt(downBtn.dataset.moveDown);
      const arr = draftContent[currentSection];
      if (idx < arr.length - 1) {
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
        renderEditor();
      }
    }
  });

  // Drag-and-drop
  area.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.content-card[draggable]');
    if (!card) return;
    dragSrcIndex = parseInt(card.dataset.index);
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  area.addEventListener('dragover', (e) => {
    const card = e.target.closest('.content-card[draggable]');
    if (!card) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetIndex = parseInt(card.dataset.index);
    if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
      const arr = draftContent[currentSection];
      const [item] = arr.splice(dragSrcIndex, 1);
      arr.splice(targetIndex, 0, item);
      dragSrcIndex = targetIndex;
      renderEditor();
      // Сохраняем индекс после перерендера
      const newCard = area.querySelector(`.content-card[data-index="${dragSrcIndex}"]`);
      if (newCard) newCard.classList.add('dragging');
    }
  });

  area.addEventListener('dragend', (e) => {
    const card = e.target.closest('.content-card.dragging');
    if (card) card.classList.remove('dragging');
    dragSrcIndex = null;
  });

  // Image upload
  area.querySelectorAll('.image-file-input').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const targetId = input.dataset.target;
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;
      const reader = new FileReader();
      reader.onload = (e) => { targetInput.value = e.target.result; };
      reader.readAsDataURL(file);
    });
  });

  // Icon picker
  area.querySelectorAll('.icon-picker').forEach((picker) => {
    const display = picker.querySelector('[data-icon-display]');
    const options = picker.querySelector('.icon-picker-options');
    const hidden = picker.querySelector('input[type="hidden"]');

    display.addEventListener('click', () => {
      const isOpen = options.style.display === 'block';
      document.querySelectorAll('.icon-picker-options').forEach((o) => o.style.display = 'none');
      options.style.display = isOpen ? 'none' : 'block';
    });

    options.querySelectorAll('.icon-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        hidden.value = opt.dataset.icon;
        display.textContent = iconLabels[opt.dataset.icon] || opt.dataset.icon;
        options.style.display = 'none';
      });
    });
  });

  // Закрыть иконки при клике вне
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.icon-picker')) {
      document.querySelectorAll('.icon-picker-options').forEach((o) => o.style.display = 'none');
    }
  });

  // Hero-поля: сохраняем в draftContent
  if (currentSection === 'hero') {
    const heroData = draftContent.hero;
    ['epigraph', 'title', 'description', 'stickerText', 'stickerSubtext'].forEach(key => {
      const el = area.querySelector(`[data-key="${key}"]`);
      if (el) {
        el.addEventListener('input', () => {
          heroData[key] = el.value;
        });
      }
    });
    const cpText = area.querySelector('[data-key="ctaPrimaryText"]');
    const cpHref = area.querySelector('[data-key="ctaPrimaryHref"]');
    const csText = area.querySelector('[data-key="ctaSecondaryText"]');
    const csHref = area.querySelector('[data-key="ctaSecondaryHref"]');
    if (cpText) cpText.addEventListener('input', () => { if (!heroData.ctaPrimary) heroData.ctaPrimary = {}; heroData.ctaPrimary.text = cpText.value; });
    if (cpHref) cpHref.addEventListener('input', () => { if (!heroData.ctaPrimary) heroData.ctaPrimary = {}; heroData.ctaPrimary.href = cpHref.value; });
    if (csText) csText.addEventListener('input', () => { if (!heroData.ctaSecondary) heroData.ctaSecondary = {}; heroData.ctaSecondary.text = csText.value; });
    if (csHref) csHref.addEventListener('input', () => { if (!heroData.ctaSecondary) heroData.ctaSecondary = {}; heroData.ctaSecondary.href = csHref.value; });
  }

  // Footer-поля: сохраняем в draftContent
  if (currentSection === 'footer') {
    const footerData = draftContent.footer;
    ['copyright', 'privacyLabel', 'disclaimer', 'aboutText', 'ctaText'].forEach(key => {
      const el = area.querySelector(`[data-key="${key}"]`);
      if (el) {
        el.addEventListener('input', () => {
          footerData[key] = el.value;
        });
      }
    });
  }
}

function getItemTitle(item, config) {
  if (item.title) return item.title;
  if (item.name) return item.name;
  if (item.question) return item.question;
  if (item.value) return item.value;
  return `Элемент`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
