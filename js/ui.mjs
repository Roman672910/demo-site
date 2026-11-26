// Общие безопасные шаблоны и диалоги. Только локальные зависимости.
import { escapeHtml, formatPrice } from './storage.mjs';

const paths = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  truck:
    '<path d="M3 5h11v12H3zM14 9h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  phone: '<path d="m7 3 3 5-3 2c2 4 3 5 7 7l2-3 5 3v3c0 1-1 2-2 2C9 21 3 15 2 5c0-1 1-2 2-2Z"/>',
  users:
    '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
  volume: '<path d="m12 3 8 4v10l-8 4-8-4V7l8-4Z"/><path d="m4 7 8 4 8-4m-8 4v10M8 5l8 4"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 12h5v5h-5z"/>',
  settings:
    '<path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  leaf: '<path d="M20 3C8 2 3 8 5 15s15 8 15-12Z"/><path d="M4 21 16 9"/>',
  zoom: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M10 7v6M7 10h6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
};
export function icon(name, extraClass = '') {
  return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.leaf}</svg>`;
}
export function productCard(product) {
  const p = Object.fromEntries(
    Object.entries(product).map(([key, value]) => [key, escapeHtml(value)]),
  );
  const specs = [
    `<span>${icon('users')}до ${p.persons} чел.</span>`,
    `<span>${icon('volume')}${Number(product.volume).toLocaleString('ru-RU')} л</span>`,
  ];
  if (product.dailyCapacity) {
    specs.push(`<span>${icon('volume')}${Number(product.dailyCapacity).toLocaleString('ru-RU')} л/сут</span>`);
  }
  if (product.peakDrain) {
    specs.push(`<span>${icon('check')}${product.peakDrain} л</span>`);
  }
  // Дополнительные изображения
  const extraImages = product.images && Array.isArray(product.images) && product.images.length
    ? product.images.filter(src => src)
    : [];
  const imageCount = 1 + extraImages.length;
  const imageCounter = imageCount > 1
    ? `<span class="product-image-count">${icon('zoom')} ${imageCount}</span>`
    : '';
  const extraImagesHtml = extraImages.length
    ? `<div class="product-extra-images">${extraImages.map(src => `<img src="${src}" alt="${p.name}" loading="lazy" decoding="async" />`).join('')}</div>`
    : '';
  return `<article class="product-card" id="product-${p.id}">
    <div class="product-image"><img src="${p.image}" alt="${p.name} — септик ${p.brand}" width="640" height="480" loading="lazy" decoding="async">${imageCounter}${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}</div>
    ${extraImagesHtml}
    <div class="product-body"><p class="product-brand">${p.brand}</p><p class="product-manufacturer">${p.manufacturer || ''}</p><h3>${p.name}</h3>
      <div class="product-specs">${specs.join('')}</div>
      <p class="product-description">${p.description}</p>
      <div class="product-bottom"><div class="product-price"><small>Цена станции</small><strong>${formatPrice(product.price)}</strong></div>
        <button class="btn btn--small" type="button" data-modal-open="callback-modal" data-product="${p.id}" aria-label="Заказать консультацию по ${p.name}">Заказать ${icon('arrow')}</button>
      </div></div></article>`;
}
export function renderProducts(container, products) {
  container.innerHTML = products.length
    ? products.map(productCard).join('')
    : `<div class="empty-state"><h3>Подходящих септиков не найдено</h3><p>Попробуйте изменить фильтры или увеличить диапазон цены.</p><button class="btn btn--outline" type="button" data-reset-filters>Сбросить фильтры</button></div>`;
}
export function galleryCard(item, interactive = false, index = 0) {
  const title = escapeHtml(item.title);
  const image = `<img src="${escapeHtml(item.image)}" alt="${title}" width="640" height="480" loading="lazy" decoding="async">${interactive ? `<span class="gallery-zoom">${icon('zoom')}</span>` : ''}`;
  return `<figure class="gallery-card">${interactive ? `<button class="gallery-image-button" type="button" data-gallery-index="${index}" aria-label="Открыть: ${title}">${image}</button>` : `<a class="gallery-image-button" href="gallery.html" aria-label="Смотреть галерею работ">${image}</a>`}<figcaption><span class="gallery-type">${escapeHtml(item.type)}</span><h3>${title}</h3></figcaption></figure>`;
}
export function initImageFallback() {
  document.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied) return;
      image.dataset.fallbackApplied = 'true';
      image.src = 'assets/images/septic-topas.svg';
      image.alt = `${image.alt} — изображение недоступно, показана иллюстрация`;
    },
    true,
  );
}

const openers = new WeakMap();
const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function visibleFocusable(dialog) {
  return [...dialog.querySelectorAll(focusableSelector)].filter(
    (element) => element.getClientRects().length && !element.closest('[hidden]'),
  );
}
export function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
  openers.set(dialog, document.activeElement);
  dialog.showModal();
  document.body.classList.add('modal-open');
  const first = dialog.querySelector('[data-autofocus]') || visibleFocusable(dialog)[0];
  first?.focus({ preventScroll: true });
}
export function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}
export function initDialogs() {
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-modal-open]');
    if (opener) {
      openDialog(opener.dataset.modalOpen);
      return;
    }
    const closer = event.target.closest('[data-modal-close]');
    if (closer) {
      closeDialog(closer.closest('dialog'));
      return;
    }
    if (event.target instanceof HTMLDialogElement) {
      const rect = event.target.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        closeDialog(event.target);
    }
  });
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const items = visibleFocusable(dialog);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) {
        document.body.classList.remove('modal-open');
        const opener = openers.get(dialog);
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      }
    });
  }
}
