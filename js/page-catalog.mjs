import { getProducts, escapeHtml } from './storage.mjs';
import { renderProducts } from './ui.mjs';

export function initCatalogPage() {
  const products = getProducts();
  const form = document.getElementById('catalog-filters');
  const results = document.querySelector('[data-catalog-results]');
  const counter = document.querySelector('[data-catalog-count]');
  if (!form || !results || !counter) return;

  const pills = {
    manufacturer: form.querySelector('[data-filter-manufacturer]'),
    persons: form.querySelector('[data-filter-persons]'),
    dailyCapacity: form.querySelector('[data-filter-daily-capacity]'),
    drainType: form.querySelector('[data-filter-drain-type]'),
    peakDrain: form.querySelector('[data-filter-peak-drain]'),
  };

  const brands = [...new Set(products.map((product) => product.brand))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );
  form.elements.brand.innerHTML =
    '<option value="">Все бренды</option>' +
    brands
      .map((brand) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`)
      .join('');

  // Производитель
  const manufacturers = [...new Set(products.map((p) => p.manufacturer).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'ru'),
  );
  if (pills.manufacturer) {
    pills.manufacturer.innerHTML = manufacturers
      .map((m) => `<button type="button" data-value="${escapeHtml(m)}" class="filter-pill">${escapeHtml(m)}</button>`)
      .join('') + '<button type="button" class="filter-pill" data-show-more="manufacturer">Показать все</button>';
  }

  // Пользователи
  const persons = [...new Set(products.map((p) => p.persons).filter(Boolean))].sort((a, b) => a - b);
  if (pills.persons) {
    pills.persons.innerHTML = persons
      .map((n) => `<button type="button" data-value="${n}" class="filter-pill">${n}</button>`)
      .join('') + '<button type="button" class="filter-pill" data-show-more="persons">Показать все</button>';
  }

  // Производительность
  const dailyCapacities = [...new Set(products.map((p) => p.dailyCapacity).filter(Boolean))].sort(
    (a, b) => a - b,
  );
  if (pills.dailyCapacity) {
    pills.dailyCapacity.innerHTML = dailyCapacities
      .map((v) => `<button type="button" data-value="${v}" class="filter-pill">${v.toLocaleString('ru-RU')}</button>`)
      .join('') + '<button type="button" class="filter-pill" data-show-more="dailyCapacity">Показать все</button>';
  }

  // Способ отвода
  const drainTypes = [...new Set(products.map((p) => p.drainType).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'ru'),
  );
  if (pills.drainType) {
    pills.drainType.innerHTML = drainTypes
      .map((d) => `<button type="button" data-value="${escapeHtml(d)}" class="filter-pill">${escapeHtml(d)}</button>`)
      .join('') + '<button type="button" class="filter-pill" data-show-more="drainType">Показать все</button>';
  }

  // Залповый сброс
  const peakDrains = [...new Set(products.map((p) => p.peakDrain).filter(Boolean))].sort(
    (a, b) => a - b,
  );
  if (pills.peakDrain) {
    pills.peakDrain.innerHTML = peakDrains
      .map((v) => `<button type="button" data-value="${v}" class="filter-pill">${v}</button>`)
      .join('') + '<button type="button" class="filter-pill" data-show-more="peakDrain">Показать все</button>';
  }

  form.elements.q.value = new URLSearchParams(location.search).get('q') || '';
  const groups = { '1-3': [1, 3], '4-6': [4, 6], '7-10': [7, 10], '11+': [11, Infinity] };
  const activeFilters = {
    manufacturer: new Set(),
    persons: new Set(),
    dailyCapacity: new Set(),
    drainType: new Set(),
    peakDrain: new Set(),
  };

  function applyFilters() {
    const brand = form.elements.brand.value;
    const people = form.elements.persons.value;
    const min = form.elements.minPrice.value === '' ? 0 : Number(form.elements.minPrice.value);
    const max =
      form.elements.maxPrice.value === '' ? Infinity : Number(form.elements.maxPrice.value);
    const query = form.elements.q.value.trim().toLocaleLowerCase('ru');
    const error = document.querySelector('[data-filter-error]');
    const invalid = min > max || min < 0 || max < 0;
    error.hidden = !invalid;
    error.textContent = invalid
      ? 'Минимальная цена не может быть больше максимальной; цены должны быть неотрицательными.'
      : '';
    if (invalid) {
      results.innerHTML = '';
      counter.textContent = 'Проверьте диапазон цены';
      return;
    }
    let filtered = products.filter((product) => {
      const capacity =
        !people || (product.persons >= groups[people][0] && product.persons <= groups[people][1]);
      const matchManufacturer =
        !activeFilters.manufacturer.size ||
        activeFilters.manufacturer.has(product.manufacturer);
      const matchPersons =
        !activeFilters.persons.size ||
        activeFilters.persons.has(String(product.persons));
      const matchDailyCapacity =
        !activeFilters.dailyCapacity.size ||
        activeFilters.dailyCapacity.has(String(product.dailyCapacity));
      const matchDrainType =
        !activeFilters.drainType.size ||
        activeFilters.drainType.has(product.drainType);
      const matchPeakDrain =
        !activeFilters.peakDrain.size ||
        activeFilters.peakDrain.has(String(product.peakDrain));
      return (
        (!brand || product.brand === brand) &&
        capacity &&
        matchManufacturer &&
        matchPersons &&
        matchDailyCapacity &&
        matchDrainType &&
        matchPeakDrain &&
        product.price >= min &&
        product.price <= max &&
        (!query ||
          `${product.name} ${product.brand} ${product.description}`
            .toLocaleLowerCase('ru')
            .includes(query))
      );
    });
    const sort = form.elements.sort.value;
    filtered.sort((a, b) =>
      sort === 'price-asc'
        ? a.price - b.price
        : sort === 'price-desc'
          ? b.price - a.price
          : sort === 'name'
            ? a.name.localeCompare(b.name, 'ru')
            : Number(b.featured) - Number(a.featured),
    );
    renderProducts(results, filtered);
    counter.textContent = `Найдено ${filtered.length} из ${products.length}`;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilters();
  });
  form.addEventListener('input', applyFilters);
  form.addEventListener('change', applyFilters);
  form.addEventListener('reset', () => {
    Object.values(activeFilters).forEach((s) => s.clear());
    form.querySelectorAll('.filter-pill[aria-pressed="true"]').forEach((btn) =>
      btn.setAttribute('aria-pressed', 'false'),
    );
    setTimeout(applyFilters, 0);
  });
  document.addEventListener('click', (event) => {
    const resetBtn = event.target.closest('[data-reset-filters]');
    if (resetBtn) {
      form.reset();
      Object.values(activeFilters).forEach((s) => s.clear());
      form.querySelectorAll('.filter-pill[aria-pressed="true"]').forEach((btn) =>
        btn.setAttribute('aria-pressed', 'false'),
      );
      return;
    }
    const showMore = event.target.closest('[data-show-more]');
    if (showMore) {
      const filterKey = showMore.dataset.showMore;
      const container = pills[filterKey];
      if (!container) return;
      const allButtons = container.querySelectorAll('.filter-pill[data-value]');
      const visible = Math.min(allButtons.length, 10);
      allButtons.forEach((btn, i) => {
        btn.style.display = i < visible ? '' : 'none';
      });
      showMore.style.display = visible < allButtons.length ? '' : 'none';
      return;
    }
    const pill = event.target.closest('.filter-pill[data-value]');
    if (!pill) return;
    const parent = pill.parentElement;
    const filterKey = [...Object.keys(pills)].find((key) => pills[key] === parent);
    if (!filterKey) return;
    const value = pill.dataset.value;
    if (activeFilters[filterKey].has(value)) {
      activeFilters[filterKey].delete(value);
      pill.setAttribute('aria-pressed', 'false');
    } else {
      activeFilters[filterKey].add(value);
      pill.setAttribute('aria-pressed', 'true');
    }
    applyFilters();
  });
  applyFilters();
}
initCatalogPage();
