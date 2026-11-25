// Доступный аккордеон: одновременно открыт не более одного вопроса.
import { getContent, escapeHtml } from './storage.mjs';
import { icon } from './ui.mjs';

export function faqMarkup(items, prefix = 'faq') {
  return items
    .map((item, index) => {
      const id = `${prefix}-${escapeHtml(item.id)}`;
      const open = index === 0;
      return `<article class="faq-item"><h3><button class="faq-question" type="button" id="${id}-question" aria-expanded="${open}" aria-controls="${id}-answer" data-faq-question><span>${escapeHtml(item.question)}</span>${icon('plus')}</button></h3><div class="faq-answer" id="${id}-answer" role="region" aria-labelledby="${id}-question" ${open ? '' : 'hidden'}><p>${escapeHtml(item.answer)}</p></div></article>`;
    })
    .join('');
}
export function initFaq(container = document, items = null, prefix = 'faq') {
  if (container instanceof HTMLElement && container.dataset.faqContainer !== undefined)
    container.innerHTML = faqMarkup(items || getContent().faq, prefix);
  const root = container instanceof HTMLElement ? container : document;
  if (root.dataset.faqBound === 'true') return;
  root.dataset.faqBound = 'true';
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-faq-question]');
    if (!button || !root.contains(button)) return;
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    root.querySelectorAll('[data-faq-question]').forEach((other) => {
      const open = other === button && willOpen;
      other.setAttribute('aria-expanded', String(open));
      const answer = document.getElementById(other.getAttribute('aria-controls'));
      if (answer) {
        if (open) {
          answer.hidden = false;
          answer.classList.add('is-open');
        } else {
          answer.classList.remove('is-open');
          setTimeout(() => { if (!answer.classList.contains('is-open')) answer.hidden = true; }, 500);
        }
      }
    });
  });
  root.addEventListener('keydown', (event) => {
    const button = event.target.closest('[data-faq-question]');
    if (!button || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...root.querySelectorAll('[data-faq-question]')];
    const index = buttons.indexOf(button);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  });
}
