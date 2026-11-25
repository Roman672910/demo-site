import { getContent, escapeHtml } from './storage.mjs';
import { galleryCard, openDialog, icon } from './ui.mjs';

export function initGalleryPage() {
  const items = getContent().gallery;
  const grid = document.querySelector('[data-gallery-grid]');
  const filters = document.querySelector('[data-gallery-filters]');
  const dialog = document.getElementById('lightbox');
  if (!grid || !filters || !dialog) return;
  let filtered = items;
  let current = 0;
  const types = [...new Set(items.map((item) => item.type))];
  filters.innerHTML = ['Все работы', ...types]
    .map(
      (type, index) =>
        `<button class="filter-pill" type="button" data-gallery-filter="${index === 0 ? '' : escapeHtml(type)}" aria-pressed="${index === 0}">${escapeHtml(type)}</button>`,
    )
    .join('');
  const count = document.querySelector('[data-gallery-count]');
  function render() {
    grid.innerHTML = filtered.length
      ? filtered.map((item, index) => galleryCard(item, true, index)).join('')
      : '<p class="empty-state">В этой категории пока нет работ.</p>';
    if (count) count.textContent = `Показано работ: ${filtered.length}`;
  }
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gallery-filter]');
    if (!button) return;
    filters
      .querySelectorAll('button')
      .forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    filtered = button.dataset.galleryFilter
      ? items.filter((item) => item.type === button.dataset.galleryFilter)
      : items;
    render();
  });
  function show(index) {
    if (!filtered.length) return;
    current = (index + filtered.length) % filtered.length;
    const item = filtered[current];
    const image = dialog.querySelector('[data-lightbox-image]');
    image.src = item.image;
    image.alt = item.title;
    dialog.querySelector('[data-lightbox-title]').textContent = item.title;
    dialog.querySelector('[data-lightbox-description]').textContent = item.description;
    dialog.querySelector('[data-lightbox-count]').textContent =
      `${current + 1} / ${filtered.length}`;
    openDialog('lightbox');
  }
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gallery-index]');
    if (button) show(Number(button.dataset.galleryIndex));
  });
  dialog.querySelector('[data-lightbox-prev]').innerHTML = icon('left');
  dialog.querySelector('[data-lightbox-next]').innerHTML = icon('right');
  dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + 1);
    }
  });
  render();
}
initGalleryPage();
