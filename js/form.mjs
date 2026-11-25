// Локальная демонстрация отправки. Никакие персональные данные не передаются в сеть.
import { getProducts, escapeHtml } from './storage.mjs';
import { openDialog, closeDialog } from './ui.mjs';

// Замените тело на fetch('/api/leads', { method: 'POST', headers: {...}, body: JSON.stringify(payload) }).
// При ошибке ответа бросьте исключение: форма сохранит введённые данные и покажет ошибку.
export async function submitLead(payload) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  return { ok: true, demo: true, source: payload.source };
}
function digitsAfterPrefix(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits && !digits.startsWith('7')) digits = `7${digits}`;
  return digits.slice(0, 11);
}
export function maskPhone(value) {
  const digits = digitsAfterPrefix(value);
  if (!digits) return '';
  let result = '+7';
  if (digits.length > 1) result += ` (${digits.slice(1, 4)}`;
  if (digits.length >= 4) result += ')';
  if (digits.length > 4) result += ` ${digits.slice(4, 7)}`;
  if (digits.length > 7) result += `-${digits.slice(7, 9)}`;
  if (digits.length > 9) result += `-${digits.slice(9, 11)}`;
  return result;
}
function ensureError(field) {
  let error = document.getElementById(`${field.id}-error`);
  if (!error) {
    error = document.createElement('p');
    error.id = `${field.id}-error`;
    error.className = 'field-error';
    error.hidden = true;
    field.closest('.field, .consent')?.append(error);
  }
  const described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!described.includes(error.id)) described.push(error.id);
  field.setAttribute('aria-describedby', described.join(' '));
  return error;
}
function setError(field, message) {
  const error = ensureError(field);
  error.textContent = message;
  error.hidden = !message;
  field.setAttribute('aria-invalid', String(Boolean(message)));
  return !message;
}
function validateField(field) {
  const value = field.type === 'checkbox' ? field.checked : field.value.trim();
  let message = '';
  if (field.required && (field.type === 'checkbox' ? !value : !value))
    message =
      field.type === 'checkbox'
        ? 'Необходимо согласие на обработку данных.'
        : 'Заполните это поле.';
  else if (field.name === 'name' && value.length < 2)
    message = 'Имя должно содержать не менее 2 символов.';
  else if (field.name === 'phone' && !/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(value))
    message = 'Введите телефон полностью: +7 (999) 123-45-67.';
  else if (field.name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))
    message = 'Проверьте адрес электронной почты.';
  else if (field.name === 'message' && value.length < 10)
    message = 'Сообщение должно содержать не менее 10 символов.';
  return setError(field, message);
}
export function populateProductOptions(form) {
  const select = form.elements.namedItem('product');
  if (!select) return;
  const previous = select.value;
  select.innerHTML =
    '<option value="">Помогите подобрать септик</option>' +
    getProducts()
      .map(
        (product) =>
          `<option value="${escapeHtml(product.id)}">${escapeHtml(product.brand)} · ${escapeHtml(product.name)}</option>`,
      )
      .join('');
  if ([...select.options].some((option) => option.value === previous)) select.value = previous;
}
function resetForm(form) {
  form.reset();
  form.querySelectorAll('[aria-invalid]').forEach((field) => setError(field, ''));
  form.querySelectorAll('input[name="context"]').forEach((field) => {
    field.value = '';
  });
}
export function initForms() {
  const forms = [...document.querySelectorAll('form[data-lead-form]')];
  forms.forEach((form, formIndex) => {
    form.noValidate = true;
    // Уникальные id нужны и для одинаковых форм в странице и в диалоге.
    const idMap = new Map();
    form.querySelectorAll('[id]').forEach((element) => {
      const old = element.id;
      const next = `lead-${formIndex}-${old}`;
      idMap.set(old, next);
      element.id = next;
    });
    form.querySelectorAll('[for]').forEach((label) => {
      if (idMap.has(label.htmlFor)) label.htmlFor = idMap.get(label.htmlFor);
    });
    form.querySelectorAll('[aria-describedby], [aria-labelledby]').forEach((element) => {
      for (const attr of ['aria-describedby', 'aria-labelledby'])
        element.setAttribute(
          attr,
          (element.getAttribute(attr) || '')
            .split(/\s+/)
            .map((id) => idMap.get(id) || id)
            .join(' '),
        );
    });
    populateProductOptions(form);
    const fields = [...form.querySelectorAll('input:not([type="hidden"]), select, textarea')];
    fields.forEach((field) => {
      ensureError(field);
      if (field.name === 'phone') {
        field.addEventListener('focus', () => {
          if (!field.value) field.value = '+7 (';
        });
        field.addEventListener('input', (event) => {
          let value = field.value;
          if (event.inputType?.startsWith('delete') && !/\d$/.test(value))
            value = value.replace(/\D(?=\D*$)/, '');
          field.value = maskPhone(value);
          field.setSelectionRange(field.value.length, field.value.length);
          if (field.getAttribute('aria-invalid') === 'true') validateField(field);
        });
        field.addEventListener('blur', () => {
          if (digitsAfterPrefix(field.value).length <= 1) field.value = '';
        });
      }
      field.addEventListener('blur', () => {
        if (field.value || field.required) validateField(field);
      });
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
      field.addEventListener('change', () => {
        if (field.type === 'checkbox') validateField(field);
      });
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.sending === 'true') return;
      const valid = fields.map(validateField).every(Boolean);
      if (!valid) {
        fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
        return;
      }
      const button = form.querySelector('[type="submit"]');
      const original = button.innerHTML;
      form.dataset.sending = 'true';
      button.disabled = true;
      button.textContent = 'Отправляем…';
      form.setAttribute('aria-busy', 'true');
      const status = form.querySelector('[data-form-status]');
      if (status) status.textContent = 'Отправка заявки…';
      const payload = Object.fromEntries(new FormData(form));
      payload.source = location.pathname.split('/').pop() || 'index.html';
      payload.consent = Boolean(payload.consent);
      try {
        await submitLead(payload);
        resetForm(form);
        closeDialog(form.closest('dialog'));
        if (status) status.textContent = '';
        openDialog('success-modal');
      } catch {
        if (status)
          status.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';
        else {
          const error = form.querySelector('[data-form-error]');
          if (error) {
            error.hidden = false;
            error.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз.';
          }
        }
      } finally {
        button.disabled = false;
        button.innerHTML = original;
        form.dataset.sending = 'false';
        form.removeAttribute('aria-busy');
      }
    });
  });
  // Контекст кнопки сохраняется в скрытом поле, а выбранный товар — в select.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-modal-open="callback-modal"]');
    if (!button) return;
    const form = document.querySelector('#callback-modal form[data-lead-form]');
    if (!form) return;
    const product = button.dataset.product || '';
    const service = button.dataset.service || '';
    form.elements.namedItem('product').value = product;
    form.elements.namedItem('context').value = service ? `Услуга: ${service}` : 'Заказ звонка';
    const title = document.querySelector('#callback-title');
    if (title) title.textContent = service ? `Заказать: ${service}` : 'Закажите бесплатный звонок';
  });
}
