import { initFaq } from './faq.mjs';
export function initFaqPage() {
  const container = document.querySelector('[data-faq-container="full"]');
  if (container) initFaq(container);
}
initFaqPage();
