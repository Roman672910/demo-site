// Редактор Hero-секции и SEO-настроек
import {
  getHero, saveHero,
  getSeo, saveSeo,
  getPageSettings, savePageSettings,
} from './storage.mjs';

let draftHero = null;
let draftSeo = null;
let draftPageSettings = null;
let currentTab = 'hero';

const pages = [
  { id: 'index', label: 'Главная' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'services', label: 'Услуги' },
  { id: 'about', label: 'О компании' },
  { id: 'gallery', label: 'Галерея' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contacts', label: 'Контакты' },
];

export function initHeroSeoEditor() {
  const heroTab = document.getElementById('tab-hero');
  const seoTab = document.getElementById('tab-seo');
  const panelHero = document.getElementById('panel-hero');
  const panelSeo = document.getElementById('panel-seo');

  if (!heroTab || !seoTab) return;

  heroTab.addEventListener('click', () => switchHeroSeoTab('hero'));
  seoTab.addEventListener('click', () => switchHeroSeoTab('seo'));

  // Сохранение Hero
  const heroForm = document.getElementById('hero-form');
  if (heroForm) {
    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(heroForm));
      data.ctaPrimary = { text: data.ctaPrimaryText, href: data.ctaPrimaryHref };
      data.ctaSecondary = { text: data.ctaSecondaryText, href: data.ctaSecondaryHref };
      try {
        saveHero(data);
        showToast('Hero-секция сохранена.');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Сохранение SEO
  const seoForm = document.getElementById('seo-form');
  if (seoForm) {
    seoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(seoForm));
      data.ogImageWidth = parseInt(data.ogImageWidth) || 1200;
      data.ogImageHeight = parseInt(data.ogImageHeight) || 630;
      try {
        saveSeo(data);
        showToast('SEO-настройки сохранены.');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Сохранение Page Settings
  const psForm = document.getElementById('page-settings-form');
  if (psForm) {
    psForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        savePageSettings(draftPageSettings);
        showToast('Настройки страниц сохранены.');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Переключение страниц в page settings
  const psNav = document.getElementById('ps-nav');
  if (psNav) {
    psNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.ps-page-link');
      if (!btn) return;
      psNav.querySelectorAll('.ps-page-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPageSettings(btn.dataset.page);
    });
  }

  // Начальное состояние
  loadHeroForm();
  loadSeoForm();
  loadPageSettingsForm();
  switchHeroSeoTab('hero');
}

function switchHeroSeoTab(tab) {
  currentTab = tab;
  const heroTab = document.getElementById('tab-hero');
  const seoTab = document.getElementById('tab-seo');
  const panelHero = document.getElementById('panel-hero');
  const panelSeo = document.getElementById('panel-seo');

  if (heroTab && panelHero) {
    const active = tab === 'hero';
    heroTab.setAttribute('aria-selected', String(active));
    heroTab.classList.toggle('active', active);
    panelHero.hidden = !active;
  }
  if (seoTab && panelSeo) {
    const active = tab === 'seo';
    seoTab.setAttribute('aria-selected', String(active));
    seoTab.classList.toggle('active', active);
    panelSeo.hidden = !active;
  }
}

function loadHeroForm() {
  const hero = getHero();
  const form = document.getElementById('hero-form');
  if (!form) return;
  const fields = ['epigraph', 'title', 'description', 'stickerText', 'stickerSubtext'];
  for (const f of fields) {
    const el = form.elements[f];
    if (el) el.value = hero[f] || '';
  }
  const cp = hero.ctaPrimary || {};
  const cs = hero.ctaSecondary || {};
  const cpText = form.elements['ctaPrimaryText'];
  const cpHref = form.elements['ctaPrimaryHref'];
  const csText = form.elements['ctaSecondaryText'];
  const csHref = form.elements['ctaSecondaryHref'];
  if (cpText) cpText.value = cp.text || '';
  if (cpHref) cpHref.value = cp.href || '';
  if (csText) csText.value = cs.text || '';
  if (csHref) csHref.value = cs.href || '';
}

function loadSeoForm() {
  const seo = getSeo();
  const form = document.getElementById('seo-form');
  if (!form) return;
  const fields = ['defaultTitle', 'defaultDescription', 'defaultKeywords', 'ogImage', 'canonical', 'twitterHandle'];
  for (const f of fields) {
    const el = form.elements[f];
    if (el) el.value = seo[f] || '';
  }
  const ow = form.elements['ogImageWidth'];
  const oh = form.elements['ogImageHeight'];
  if (ow) ow.value = seo.ogImageWidth || 1200;
  if (oh) oh.value = seo.ogImageHeight || 630;
}

function loadPageSettingsForm() {
  const ps = getPageSettings();
  draftPageSettings = JSON.parse(JSON.stringify(ps));
  renderPageSettings('index');
}

function renderPageSettings(pageId) {
  const container = document.getElementById('ps-editor-area');
  if (!container) return;
  const page = pages.find(p => p.id === pageId);
  const data = draftPageSettings[pageId] || {};

  container.innerHTML = `
    <h3>${page.label}</h3>
    <div class="ps-fields">
      <div class="field">
        <label for="ps-title-${pageId}">Title</label>
        <input id="ps-title-${pageId}" data-page="${pageId}" data-field="title" type="text" value="${escapeHtml(data.title || '')}" maxlength="120" />
        <span class="field-hint">Заголовок вкладки браузера (до 60 символов оптимально)</span>
      </div>
      <div class="field field--wide">
        <label for="ps-desc-${pageId}">Description</label>
        <textarea id="ps-desc-${pageId}" data-page="${pageId}" data-field="description" rows="3" maxlength="300">${escapeHtml(data.description || '')}</textarea>
        <span class="field-hint">Описание для поисковых систем (до 160 символов оптимально)</span>
      </div>
      <div class="field field--wide">
        <label for="ps-keys-${pageId}">Keywords</label>
        <input id="ps-keys-${pageId}" data-page="${pageId}" data-field="keywords" type="text" value="${escapeHtml(data.keywords || '')}" maxlength="500" />
        <span class="field-hint">Ключевые слова через запятую</span>
      </div>
    </div>
  `;

  // Привязка изменений
  container.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      if (!draftPageSettings[pageId]) draftPageSettings[pageId] = {};
      draftPageSettings[pageId][el.dataset.field] = el.value;
    });
  });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
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
