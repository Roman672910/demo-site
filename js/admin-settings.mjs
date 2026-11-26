// Редактор настроек сайта: контакты, соцсети, доп. информация
import { getContent, saveContent } from './storage.mjs';

let draftContent = null;

export function initSettingsEditor() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  loadSettingsForm();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.contacts = {
      phone: data.phone,
      email: data.email,
      address1: data.address1,
      address2: data.address2,
      hours: data.hours,
    };
    data.social = {
      telegram: data.socialTelegram || '',
      whatsapp: data.socialWhatsapp || '',
      vk: data.socialVk || '',
      youtube: data.socialYoutube || '',
    };
    data.additional = {
      utilityRegion: data.utilityRegion || 'Москва и Московская область',
      utilityNote: data.utilityNote || 'Септики для комфортной загородной жизни',
      brandTagline: data.brandTagline || 'Инженерные системы для загородной жизни',
      freeDeliveryKm: parseInt(data.freeDeliveryKm) || 50,
      warrantyYears: parseInt(data.warrantyYears) || 1,
      workDays: data.workDays || 'Ежедневно с 09:00 до 20:00',
    };
    try {
      saveContent(data);
      showToast('Настройки сохранены.');
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function loadSettingsForm() {
  draftContent = JSON.parse(JSON.stringify(getContent()));
  const c = draftContent;
  const form = document.getElementById('settings-form');
  if (!form) return;

  const contacts = c.contacts || {};
  const fields = {
    phone: contacts.phone || '',
    email: contacts.email || '',
    address1: contacts.address1 || '',
    address2: contacts.address2 || '',
    hours: contacts.hours || '',
  };
  for (const [key, value] of Object.entries(fields)) {
    const el = form.elements[key];
    if (el) el.value = value;
  }

  // Additional
  const add = form.elements;
  if (add.utilityRegion) add.utilityRegion.value = c.footer?.menuLinks?.[0]?.text ? '' : 'Москва и Московская область';
  if (add.utilityNote) add.utilityNote.value = 'Септики для комфортной загородной жизни';
  if (add.brandTagline) add.brandTagline.value = 'Инженерные системы для загородной жизни';
  if (add.freeDeliveryKm) add.freeDeliveryKm.value = '50';
  if (add.warrantyYears) add.warrantyYears.value = '1';
  if (add.workDays) add.workDays.value = 'Ежедневно с 09:00 до 20:00';
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
