// Общая точка входа всех публичных страниц. Не заменяет HTML и не реализует SPA.
import { getContent, escapeHtml, formatPrice } from './storage.mjs';
import { initNavigation, initContacts } from './nav.mjs';
import { initDialogs, initImageFallback, icon, galleryCard } from './ui.mjs';
import { initForms } from './form.mjs';
import { initAdminMode } from './admin-mode.mjs';

function renderContentBlocks() {
  const content = getContent();
  document.querySelectorAll('[data-content]').forEach((container) => {
    const key = container.dataset.content;
    if (key === 'advantages')
      container.innerHTML = content.advantages
        .map(
          (item) =>
            `<article class="benefit reveal reveal-delay-1"><span class="benefit-icon">${icon(item.icon)}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div></article>`,
        )
        .join('');
    if (key === 'trust')
      container.innerHTML = content.trust
        .map(
          (item, i) =>
            `<article class="trust-card reveal reveal-delay-${(i % 3) + 1}">${icon(item.icon)}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`,
        )
        .join('');
    if (key === 'partners')
      container.innerHTML = content.partners
        .map(
          (item, i) =>
            `<div class="partner-logo reveal reveal-delay-${(i % 4) + 1}" role="img" aria-label="Логотип-заглушка: ${escapeHtml(item.name)}">${icon('leaf')}<span>${escapeHtml(item.name)}</span></div>`,
        )
        .join('');
    if (key === 'steps')
      container.innerHTML = content.steps
        .map(
          (item, index) =>
            `<li class="step reveal reveal-delay-${(index % 4) + 1}"><span class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></li>`,
        )
        .join('');
    if (key === 'stats')
      container.innerHTML = content.stats
        .map(
          (item, i) =>
            `<div class="stat reveal reveal-delay-${(i % 4) + 1}"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`,
        )
        .join('');
    if (key === 'services')
      container.innerHTML = content.services
        .map(
          (item, i) =>
            `<article class="service-card reveal reveal-delay-${(i % 3) + 1}" id="service-${escapeHtml(item.id)}">${icon(item.icon)}<h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p><div class="service-bottom"><span class="service-price"><small>от </small>${formatPrice(item.price)}</span><button class="btn btn--small" type="button" data-modal-open="callback-modal" data-service="${escapeHtml(item.title)}">Заказать ${icon('arrow')}</button></div></article>`,
        )
        .join('');
    if (key === 'gallery-preview')
      container.innerHTML = content.gallery
        .slice(0, 3)
        .map((item, i) => galleryCard(item, false))
        .join('');
  });
}

function initHeroAnimation() {
  const hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hero.classList.add('is-loaded');
      });
    });
  }
}

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );

  reveals.forEach((el) => observer.observe(el));
}

function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  const toggleVisibility = () => {
    if (window.scrollY > 400) {
      btn.classList.add('is-visible');
      btn.removeAttribute('hidden');
    } else {
      btn.classList.remove('is-visible');
      btn.setAttribute('hidden', '');
    }
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        toggleVisibility();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  toggleVisibility();
}

export function initApp() {
  document.documentElement.classList.add('js-enabled');
  renderContentBlocks();
  initHeroAnimation();
  initScrollReveal();
  initBackToTop();
  initContacts();
  initNavigation();
  initImageFallback();
  initDialogs();
  initForms();
  initAdminMode();
  document.addEventListener('storage-warning', (event) => {
    const notice = document.createElement('div');
    notice.className = 'site-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = event.detail;
    document.body.append(notice);
  });
}
initApp();
