// CRUD товаров. Контент управляется через admin-wysiwyg.mjs (WYSIWYG iframe).
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  escapeHtml,
  formatPrice,
} from './storage.mjs';
import { openDialog, closeDialog } from './ui.mjs';

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function initAdminCrud({ notify }) {
  const table = document.querySelector('[data-products-table]');
  const productDialog = document.getElementById('product-dialog');
  const productForm = document.getElementById('product-form');
  const deleteDialog = document.getElementById('delete-dialog');
  let deletingId = null;

  // Загрузка изображения с компьютера для продукта
  const imageFileInput = document.getElementById('p-image-file');
  const imagePreview = document.getElementById('p-image-preview');
  const imageUrlField = document.getElementById('p-image');
  if (imageFileInput) {
    imageFileInput.addEventListener('change', () => {
      const file = imageFileInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        notify('Выберите файл изображения.', true);
        imageFileInput.value = '';
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        notify('Файл слишком большой: максимум 4 МБ.', true);
        imageFileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        imageUrlField.value = dataUrl;
        if (imagePreview) {
          imagePreview.innerHTML = `<img src="${dataUrl}" alt="Превью" style="max-width:100px;max-height:60px;border-radius:6px;border:1px solid var(--color-border);" />`;
        }
      };
      reader.readAsDataURL(file);
    });
  }
  // Превью при ручном вводе URL
  if (imageUrlField) {
    imageUrlField.addEventListener('input', () => {
      if (imagePreview) {
        const url = imageUrlField.value.trim();
        if (url && (url.startsWith('data:') || url.startsWith('http'))) {
          imagePreview.innerHTML = `<img src="${url}" alt="Превью" style="max-width:100px;max-height:60px;border-radius:6px;border:1px solid var(--color-border);" />`;
        } else {
          imagePreview.innerHTML = '';
        }
      }
    });
  }

  function renderTable() {
    const products = getProducts();
    table.innerHTML = products.length
      ? products
          .map(
            (p) =>
              `<tr><td class="product-id">${escapeHtml(p.id)}</td><td><strong>${escapeHtml(p.name)}</strong></td><td>${escapeHtml(p.brand)}</td><td>${p.volume.toLocaleString('ru-RU')}</td><td>${formatPrice(p.price)}</td><td>${p.persons}</td><td><div class="table-actions"><button class="btn btn--outline btn--small" type="button" data-edit-product="${escapeHtml(p.id)}" aria-label="Редактировать ${escapeHtml(p.name)}">Изм.</button><button class="btn btn--outline btn--small delete-button" type="button" data-delete-product="${escapeHtml(p.id)}" aria-label="Удалить ${escapeHtml(p.name)}">Удал.</button></div></td></tr>`,
          )
          .join('')
      : '<tr><td colspan="7">Каталог пуст. Добавьте первый септик.</td></tr>';
    document.querySelector('[data-admin-product-count]').textContent =
      `Всего товаров: ${products.length}`;
  }
  function openProduct(id = '') {
    productForm.reset();
    productForm.elements.id.value = id;
    const product = id
      ? getProducts().find((item) => item.id === id)
      : { image: 'assets/images/septic-topas.svg', category: 'station', featured: false };
    if (!product) {
      notify('Товар не найден.', true);
      return;
    }
    for (const [key, value] of Object.entries(product)) {
      const field = productForm.elements.namedItem(key);
      if (!field) continue;
      if (field.type === 'checkbox') field.checked = Boolean(value);
      else field.value = value;
    }
    document.getElementById('product-dialog-title').textContent = id
      ? 'Редактировать септик'
      : 'Добавить септик';
    document.getElementById('product-form-error').hidden = true;
    openDialog('product-dialog');
  }
  table.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-edit-product]');
    const remove = event.target.closest('[data-delete-product]');
    if (edit) openProduct(edit.dataset.editProduct);
    if (remove) {
      deletingId = remove.dataset.deleteProduct;
      const product = getProducts().find((item) => item.id === deletingId);
      document.getElementById('delete-product-name').textContent = product?.name || '';
      openDialog('delete-dialog');
    }
  });
  document.querySelector('[data-add-product]').addEventListener('click', () => openProduct());
  productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(productForm));
    for (const key of ['volume', 'price', 'persons']) data[key] = Number(data[key]);
    data.featured = productForm.elements.featured.checked;
    const error = document.getElementById('product-form-error');
    try {
      if (data.id) updateProduct(data.id, data);
      else addProduct(data);
      closeDialog(productDialog);
      renderTable();
      notify('Септик сохранён. Обновите публичные страницы, чтобы увидеть изменения.');
    } catch (exception) {
      error.textContent = exception.message;
      error.hidden = false;
    }
  });
  document.getElementById('confirm-delete-product').addEventListener('click', () => {
    try {
      deleteProduct(deletingId);
      deletingId = null;
      closeDialog(deleteDialog);
      renderTable();
      notify('Септик удалён.');
    } catch (exception) {
      notify(exception.message, true);
    }
  });

  renderTable();
  return { refresh: renderTable };
}
