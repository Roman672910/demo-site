import { getProducts, getContent } from './storage.mjs';
import { renderProducts } from './ui.mjs';
import { initFaq } from './faq.mjs';

export function initIndexPage() {
  const products = getProducts();
  const popular = [
    ...products.filter((product) => product.featured),
    ...products.filter((product) => !product.featured),
  ].slice(0, 3);
  const container = document.querySelector('[data-popular-products]');
  if (container) renderProducts(container, popular);
  const faq = document.querySelector('[data-faq-container="short"]');
  if (faq) initFaq(faq, getContent().faq.slice(0, 3), 'home-faq');
}
initIndexPage();
