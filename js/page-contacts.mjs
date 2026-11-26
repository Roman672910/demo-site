import { getContent } from './storage.mjs';

// Координаты офисов: [долгота, широта]
const OFFICES = {
  moscow: { ll: [37.530000, 55.672500], pt: '37.530000,55.672500,pm2rdm', name: 'Москва, Дорогобужская 14' },
  oblast: { ll: [37.275000, 55.741700], pt: '37.275000,55.741700,pm2rdm', name: 'Юдино, Можайское шоссе 55Бс3' },
};

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

  // Интерактивная карта: клик по карточке офиса показывает точку(и) на карте
  const mapFrame = document.getElementById('contacts-map');
  const mapHint = document.querySelector('.map-hint');
  const officeCards = document.querySelectorAll('[data-map-point]');
  let moscowShown = false;
  let oblastShown = false;

  function updateMap() {
    if (!mapFrame) return;

    // Обновляем активные карточки
    officeCards.forEach((card) => {
      const key = card.dataset.mapPoint;
      const isActive = key === 'moscow' ? moscowShown : oblastShown;
      card.classList.toggle('map-active', isActive);
    });

    // Обновляем iframe с точками
    if (moscowShown && oblastShown) {
      // Обе точки
      mapFrame.src = 'https://yandex.ru/map-widget/v1/?ll=37.402530%2C55.707100&z=10&l=map&pt=37.530000%2C55.672500%2Cpm2rdm~37.275000%2C55.741700%2Cpm2rdm';
    } else if (moscowShown) {
      // Только Москва
      mapFrame.src = 'https://yandex.ru/map-widget/v1/?ll=37.530000%2C55.672500&z=14&l=map&pt=37.530000%2C55.672500%2Cpm2rdm';
    } else if (oblastShown) {
      // Только Область
      mapFrame.src = 'https://yandex.ru/map-widget/v1/?ll=37.275000%2C55.741700&z=14&l=map&pt=37.275000%2C55.741700%2Cpm2rdm';
    } else {
      // По умолчанию — оба офиса
      mapFrame.src = 'https://yandex.ru/map-widget/v1/?ll=37.402530%2C55.707100&z=10&l=map&pt=37.530000%2C55.672500%2Cpm2rdm~37.275000%2C55.741700%2Cpm2rdm';
    }

    // Скрываем подсказку
    if (mapHint && (moscowShown || oblastShown)) mapHint.classList.add('hidden');
    else if (mapHint) mapHint.classList.remove('hidden');
  }

  // Клик по карточке офиса
  officeCards.forEach((card) => {
    card.addEventListener('click', () => {
      const key = card.dataset.mapPoint;
      if (key === 'moscow') moscowShown = !moscowShown;
      if (key === 'oblast') oblastShown = !oblastShown;
      updateMap();
    });
  });
}
initContactsPage();
