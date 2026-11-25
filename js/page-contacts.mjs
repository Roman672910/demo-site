import { getContent } from './storage.mjs';
export function initContactsPage() {
  const contacts = getContent().contacts;
  document.querySelectorAll('[data-copy-address]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = contacts[button.dataset.copyAddress];
      const status = document.getElementById('copy-status');
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard недоступен');
        await navigator.clipboard.writeText(value);
        button.textContent = 'Адрес скопирован';
        if (status) status.textContent = 'Адрес скопирован в буфер обмена.';
      } catch {
        // Выделяем адрес: пользователь может скопировать его вручную.
        const address = button.closest('.contact-card').querySelector('address');
        const range = document.createRange();
        range.selectNodeContents(address);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = 'Адрес выделен — скопируйте';
        if (status)
          status.textContent = 'Адрес выделен. Используйте команду копирования устройства.';
      }
      setTimeout(() => {
        button.textContent = 'Скопировать адрес';
      }, 3000);
    });
  });
}
initContactsPage();
