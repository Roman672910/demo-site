// Обычная многостраничная навигация. Никакого перехвата переходов между HTML.
import { getContent, phoneHref } from './storage.mjs';

export function initNavigation() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach((link) => {
    const active = link.getAttribute('href') === current;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  const setMenu = (open) => {
    toggle?.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
    if (toggle) toggle.classList.toggle('is-active', open);
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-inner')) setMenu(false);
    // Перехватываем только якорь внутри текущей страницы, не ссылки на другие файлы.
    const anchor = event.target.closest('a[href^="#"]');
    if (
      !anchor ||
      anchor.getAttribute('href') === '#' ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = document.getElementById(anchor.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
    history.replaceState(null, '', anchor.getAttribute('href'));
    if (!target.matches('input, button, a, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  matchMedia('(min-width: 768px)').addEventListener('change', () => setMenu(false));
}

export function initContacts() {
  const contacts = getContent().contacts;
  document.querySelectorAll('[data-contact]').forEach((element) => {
    const key = element.dataset.contact;
    if (!Object.hasOwn(contacts, key)) return;
    element.textContent = contacts[key];
    if (element.matches('a[data-contact="phone"]')) element.href = phoneHref(contacts.phone);
    if (element.matches('a[data-contact="email"]')) element.href = `mailto:${contacts.email}`;
  });
}
