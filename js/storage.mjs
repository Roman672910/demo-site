// Единый источник данных. localStorage не является серверной базой или защитой.
import { defaultProducts } from './data/products.mjs';
import { defaultContent } from './data/content.mjs';

export const ADMIN_PASSWORD = 'mosregseptik2024';
export const CONTACTS = Object.freeze({
  phone: '+7 (495) 000-00-00',
  email: 'info@mosregseptik.ru',
  address1: 'г. Москва, ул. Дорогобужская 14',
  address2: 'Московская обл., Одинцовский г.о., Юдино, Можайское шоссе, д. 55Бс3',
  hours: 'Ежедневно с 09:00 до 20:00',
});
export const CATEGORIES = Object.freeze({
  station: 'Станция биоочистки',
  septic: 'Септик',
  storage: 'Накопитель',
});
const KEYS = { products: 'mosregseptik.products.v1', content: 'mosregseptik.content.v1' };
const DATA_VERSION = 3; // Увеличивать при изменении структуры данных
const memory = new Map();
let storageWarningShown = false;
const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, min = 1, max = 5000) =>
  typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const positive = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100000000;

// Максимальный размер localStorage (примерно 5МБ)
const MAX_STORAGE_SIZE = 4.5 * 1024 * 1024;

// Проверяем размер хранилища и сбрасываем если переполнен
function checkStorageSize() {
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      totalSize += key.length + localStorage.getItem(key).length * 2; // UTF-16
    }
    if (totalSize > MAX_STORAGE_SIZE) {
      // Переполнение — сбрасываем к заводским данным
      remove(KEYS.products);
      remove(KEYS.content);
      try {
        localStorage.setItem('mosregseptik.version', String(DATA_VERSION));
      } catch { /* ignore */ }
      storageWarningShown = true;
      document.dispatchEvent(
        new CustomEvent('storage-warning', {
          detail: 'Хранилище переполнено. Данные сброшены к заводским настройкам.',
        }),
      );
      return false;
    }
  } catch { /* ignore */ }
  return true;
}
// Проверяем версию хранилища — если не совпадает, сбрасываем кэш
function checkVersion() {
  try {
    const version = localStorage.getItem('mosregseptik.version');
    if (version !== String(DATA_VERSION)) {
      remove(KEYS.products);
      remove(KEYS.content);
      try {
        localStorage.setItem('mosregseptik.version', String(DATA_VERSION));
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}
checkVersion();

// При запрете хранилища сайт остаётся работоспособным в памяти текущей вкладки.
function read(key) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}
function write(key, value) {
  const serialized = JSON.stringify(value);
  memory.set(key, serialized);
  try {
    localStorage.setItem(key, serialized);
  } catch {
    if (!storageWarningShown) {
      storageWarningShown = true;
      document.dispatchEvent(
        new CustomEvent('storage-warning', {
          detail: 'Хранилище недоступно. Изменения сохранены только в памяти этой вкладки.',
        }),
      );
    }
  }
}
function remove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* Работаем в памяти. */
  }
}
function parse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function validateProduct(input, partial = false) {
  if (!isObject(input)) return { ok: false, error: 'Карточка должна быть объектом.' };
  const source = partial ? { ...input } : { featured: false, badge: '', ...input };
  // Мягкая проверка ID: если ID есть, но содержит недопустимые символы — предупреждаем.
// Если ID пустой — пропускаем (он будет сгенерирован автоматически).
if (!partial && source.id && !/^[a-zA-Z0-9_.-]+$/.test(source.id)) {
  return {
    ok: false,
    error: 'ID должен содержать только латиницу, цифры, дефис, подчёркивание и точку.',
  };
}
  if (source.name !== undefined && !text(source.name, 2, 120))
    return { ok: false, error: 'Название: от 2 до 120 символов.' };
  if (!partial && source.name === undefined) return { ok: false, error: 'Укажите название.' };
  if (source.brand !== undefined && !text(source.brand, 2, 80))
    return { ok: false, error: 'Бренд: от 2 до 80 символов.' };
  for (const key of ['volume', 'price']) {
    if (source[key] !== undefined && !positive(source[key]))
      return { ok: false, error: `${key === 'volume' ? 'Объём' : 'Цена'}: число больше 0.` };
  }
  if (
    source.persons !== undefined &&
    (!Number.isInteger(source.persons) || source.persons < 1 || source.persons > 1000)
  )
    return { ok: false, error: 'Количество человек: целое число от 1 до 1000.' };
  if (source.description !== undefined && !text(source.description, 10, 3000))
    return { ok: false, error: 'Описание: от 10 до 3000 символов.' };
  if (source.image !== undefined && !safeImageUrl(source.image))
    return { ok: false, error: 'Изображение: локальный путь assets/… или корректный http(s)-URL.' };
  if (source.images !== undefined) {
    if (!Array.isArray(source.images))
      return { ok: false, error: 'Дополнительные изображения: массив URL.' };
    if (source.images.length > 10)
      return { ok: false, error: 'Дополнительные изображения: максимум 10 штук.' };
    for (let i = 0; i < source.images.length; i++) {
      if (!safeImageUrl(source.images[i]))
        return { ok: false, error: `Дополнительное изображение #${i + 1}: некорректный URL.` };
    }
  }
  if (source.category !== undefined && !Object.hasOwn(CATEGORIES, source.category))
    return { ok: false, error: 'Неизвестная категория.' };
  if (!partial) {
    for (const key of ['brand', 'volume', 'price', 'persons', 'description', 'image', 'category']) {
      if (source[key] === undefined) return { ok: false, error: `Не заполнено поле ${key}.` };
    }
    if (!text(source.badge, 0, 80) || typeof source.featured !== 'boolean')
      return { ok: false, error: 'Некорректные метка или признак популярного товара.' };
  }
  const product = Object.fromEntries(
    Object.entries(source).filter(([key]) =>
      [
        'id',
        'name',
        'brand',
        'volume',
        'price',
        'persons',
        'description',
        'image',
        'category',
        'badge',
        'featured',
        'images',
      ].includes(key),
    ),
  );
  for (const key of ['name', 'brand', 'description', 'image', 'badge'])
    if (typeof product[key] === 'string') product[key] = product[key].trim();
  return { ok: true, product };
}
function safeImageUrl(value) {
  if (!value || typeof value !== 'string') return false;
  // base64 data URI — разрешаем полностью (содержит +, =, / которые не являются пробелами)
  if (value.startsWith('data:image/')) {
    // Проверяем что это валидный data URI (не слишком длинный и без опасных символов)
    if (value.length > 10 * 1024 * 1024) return false; // 10MB limit
    return true;
  }
  if (/[<>"']/.test(value)) return false;
  // Внешние URL (Tilda CDN и другие)
  if (/^https?:\/\/.+/i.test(value)) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  if (value.startsWith('assets/'))
    return !value.includes('..') && /\.(svg|png|jpe?g|webp|avif)$/i.test(value);
  return false;
}
function validateProducts(input) {
  if (!Array.isArray(input) || input.length > 500)
    return { ok: false, error: 'Ожидается массив из не более 500 септиков.' };
  const products = [];
  const ids = new Set();
  for (const item of input) {
    const result = validateProduct(item);
    if (!result.ok) return result;
    if (ids.has(result.product.id))
      return { ok: false, error: `Повторяющийся ID: ${result.product.id}` };
    ids.add(result.product.id);
    products.push(result.product);
  }
  return { ok: true, products };
}
export function getProducts() {
  const stored = parse(read(KEYS.products));
  const result = validateProducts(stored);
  return result.ok ? result.products : clone(defaultProducts);
}
export function saveProducts(products) {
  const result = validateProducts(products);
  if (!result.ok) throw new Error(result.error);
  write(KEYS.products, result.products);
  return clone(result.products);
}
export function addProduct(product) {
  // Всегда генерируем новый id — игнорируем пустой id из формы
  const id = `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const clean = { ...product, id };
  delete clean.id; // удаляем id из формы, подставим сгенерированный
  const result = validateProduct({ ...clean, id });
  if (!result.ok) throw new Error(result.error);
  const products = getProducts();
  products.push(result.product);
  saveProducts(products);
  return clone(result.product);
}
export function updateProduct(id, patch) {
  const products = getProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) throw new Error('Септик не найден.');
  if (patch.id && patch.id !== id)
    throw new Error('ID существующего товара менять нельзя.');
  // Не передаём пустой/невалидный id из формы — оставляем существующий
  const cleanPatch = { ...patch };
  if (!cleanPatch.id || !/^[a-zA-Z0-9_.-]+$/.test(cleanPatch.id)) {
    delete cleanPatch.id;
  }
  // products[index] уже содержит верный id — merge перекроет только изменённые поля
  const combined = { ...products[index], ...cleanPatch };
  const result = validateProduct(combined);
  if (!result.ok) throw new Error(result.error);
  products[index] = result.product;
  saveProducts(products);
  return clone(result.product);
}
export function deleteProduct(id) {
  const products = getProducts();
  const next = products.filter((product) => product.id !== id);
  if (next.length === products.length) return false;
  saveProducts(next);
  return true;
}
export function resetProducts() {
  remove(KEYS.products);
  return clone(defaultProducts);
}
export function exportProducts() {
  return JSON.stringify(getProducts(), null, 2);
}
export function importProducts(json) {
  try {
    const input = typeof json === 'string' ? JSON.parse(json) : json;
    const result = validateProducts(Array.isArray(input) ? input : input?.products);
    if (!result.ok) return result;
    saveProducts(result.products);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Импорт отменён: ${error.message}` };
  }
}

function validateCollection(items, name, fields, min = 1, max = 50) {
  if (!Array.isArray(items) || items.length < min || items.length > max)
    throw new Error(`${name}: от ${min} до ${max} элементов.`);
  const ids = new Set();
  return items.map((item) => {
    if (!isObject(item) || !text(item.id, 1, 100) || ids.has(item.id))
      throw new Error(`${name}: нужен уникальный строковый id.`);
    ids.add(item.id);
    const result = { id: item.id };
    for (const [key, type, minimum, maximum] of fields) {
      if (type === 'number' ? !positive(item[key]) : !text(item[key], minimum, maximum))
        throw new Error(`${name}: некорректное поле «${key}».`);
      result[key] = type === 'number' ? item[key] : item[key].trim();
    }
    if (item.image !== undefined && !safeImageUrl(item.image))
      throw new Error(`${name}: некорректный URL изображения.`);
    if (typeIcon(item.icon)) result.icon = item.icon;
    return result;
  });
}
function typeIcon(icon) {
  return typeof icon === 'string' && /^[a-z-]+$/.test(icon);
}
function safeUrl(value) {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('http')) {
    try { new URL(value); return value; } catch { return ''; }
  }
  if (value.startsWith('assets/') || value.startsWith('#') || value.startsWith('/')) return value;
  return '';
}
function safeLink(value, defaultText) {
  if (!isObject(value)) return { text: defaultText, href: '' };
  return {
    text: text(value.text, 1, 200) ? value.text.trim() : defaultText,
    href: safeUrl(value.href),
  };
}
function validateHero(input) {
  if (!isObject(input)) return clone(defaultContent.hero);
  const h = clone(defaultContent.hero);
  if (text(input.title, 5, 300)) h.title = input.title.trim();
  if (text(input.description, 10, 2000)) h.description = input.description.trim();
  if (text(input.epigraph, 1, 120)) h.epigraph = input.epigraph.trim();
  if (text(input.stickerText, 1, 100)) h.stickerText = input.stickerText.trim();
  if (text(input.stickerSubtext, 1, 150)) h.stickerSubtext = input.stickerSubtext.trim();
  h.ctaPrimary = safeLink(input.ctaPrimary, h.ctaPrimary.text);
  h.ctaSecondary = safeLink(input.ctaSecondary, h.ctaSecondary.text);
  return h;
}
function validateFooter(input) {
  if (!isObject(input)) return clone(defaultContent.footer);
  const f = clone(defaultContent.footer);
  if (text(input.copyright, 1, 200)) f.copyright = input.copyright.trim();
  if (text(input.privacyLabel, 1, 120)) f.privacyLabel = input.privacyLabel.trim();
  if (text(input.disclaimer, 1, 200)) f.disclaimer = input.disclaimer.trim();
  if (text(input.adminLink, 1, 100)) f.adminLink = input.adminLink.trim();
  if (text(input.aboutText, 5, 500)) f.aboutText = input.aboutText.trim();
  if (text(input.ctaText, 5, 300)) f.ctaText = input.ctaText.trim();
  if (Array.isArray(input.menuLinks)) {
    const links = [];
    for (const lk of input.menuLinks) {
      if (isObject(lk) && text(lk.text, 1, 80)) {
        links.push({ id: lk.id || `link-${Date.now()}`, text: lk.text.trim(), href: safeUrl(lk.href) });
      }
    }
    if (links.length) f.menuLinks = links;
  }
  return f;
}
function validateNavigation(input) {
  if (!isObject(input)) return clone(defaultContent.navigation);
  const n = clone(defaultContent.navigation);
  if (text(input.label, 1, 80)) n.label = input.label.trim();
  if (Array.isArray(input.links)) {
    const links = [];
    for (const lk of input.links) {
      if (isObject(lk) && text(lk.text, 1, 80)) {
        links.push({ id: lk.id || `nav-${Date.now()}`, text: lk.text.trim(), href: safeUrl(lk.href) });
      }
    }
    if (links.length) n.links = links;
  }
  return n;
}
function validateSeo(input) {
  if (!isObject(input)) return clone(defaultContent.seo);
  const s = clone(defaultContent.seo);
  if (text(input.defaultTitle, 2, 120)) s.defaultTitle = input.defaultTitle.trim();
  if (text(input.defaultDescription, 10, 300)) s.defaultDescription = input.defaultDescription.trim();
  if (text(input.defaultKeywords, 5, 500)) s.defaultKeywords = input.defaultKeywords.trim();
  if (text(input.ogImage, 1, 500)) s.ogImage = input.ogImage.trim();
  if (Number.isFinite(input.ogImageWidth) && input.ogImageWidth > 0) s.ogImageWidth = input.ogImageWidth;
  if (Number.isFinite(input.ogImageHeight) && input.ogImageHeight > 0) s.ogImageHeight = input.ogImageHeight;
  if (text(input.canonical, 1, 500)) s.canonical = input.canonical.trim();
  if (text(input.twitterHandle, 1, 50)) s.twitterHandle = input.twitterHandle.trim();
  return s;
}
function validatePageSettings(input) {
  if (!isObject(input)) return clone(defaultContent.pageSettings);
  const ps = clone(defaultContent.pageSettings);
  const pages = Object.keys(defaultContent.pageSettings);
  for (const page of pages) {
    if (input[page] && isObject(input[page])) {
      const src = input[page];
      const pg = ps[page];
      if (text(src.title, 2, 120)) pg.title = src.title.trim();
      if (text(src.description, 10, 300)) pg.description = src.description.trim();
      if (text(src.keywords, 5, 500)) pg.keywords = src.keywords.trim();
    }
  }
  return ps;
}
export function validateContent(input) {
  try {
    if (!isObject(input)) throw new Error('Контент должен быть объектом.');
    const c = clone(defaultContent);
    const simple = [
      ['title', 'text', 2, 160],
      ['description', 'text', 10, 2000],
      ['icon', 'text', 1, 40],
    ];
    c.advantages = validateCollection(
      input.advantages ?? c.advantages,
      'Преимущества',
      simple,
      1,
      12,
    );
    c.trust = validateCollection(input.trust ?? c.trust, 'Доверие', simple, 1, 12);
    c.partners = validateCollection(
      input.partners ?? c.partners,
      'Партнёры',
      [['name', 'text', 2, 80]],
      1,
      12,
    );
    c.steps = validateCollection(
      input.steps ?? c.steps,
      'Шаги',
      [
        ['title', 'text', 2, 160],
        ['description', 'text', 10, 2000],
      ],
      1,
      8,
    );
    c.faq = validateCollection(
      input.faq ?? c.faq,
      'Вопросы',
      [
        ['question', 'text', 5, 300],
        ['answer', 'text', 10, 5000],
      ],
      1,
      100,
    );
    c.gallery = validateCollection(
      input.gallery ?? c.gallery,
      'Галерея',
      [
        ['title', 'text', 2, 160],
        ['type', 'text', 2, 60],
        ['image', 'text', 1, 2000],
        ['description', 'text', 10, 2000],
      ],
      1,
      100,
    );
    c.services = validateCollection(
      input.services ?? c.services,
      'Услуги',
      [
        ['title', 'text', 2, 160],
        ['description', 'text', 10, 2000],
        ['price', 'number'],
        ['icon', 'text', 1, 40],
      ],
      1,
      30,
    );
    c.stats = validateCollection(
      input.stats ?? c.stats,
      'Цифры',
      [
        ['value', 'text', 1, 30],
        ['label', 'text', 2, 160],
      ],
      1,
      8,
    );
    const contacts = input.contacts ?? c.contacts;
    if (!isObject(contacts)) throw new Error('Контакты должны быть объектом.');
    for (const key of Object.keys(CONTACTS)) {
      if (!text(contacts[key], 5, 300)) throw new Error(`Контакты: заполните ${key}.`);
      c.contacts[key] = contacts[key].trim();
    }
    if (
      !/^\+?[0-9 ()-]{10,25}$/.test(c.contacts.phone) ||
      c.contacts.phone.replace(/\D/g, '').length !== 11
    )
      throw new Error('Телефон должен содержать 11 цифр.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contacts.email))
      throw new Error('Некорректный email.');
    // Новые поля
    c.hero = validateHero(input.hero);
    c.footer = validateFooter(input.footer);
    c.navigation = validateNavigation(input.navigation);
    c.seo = validateSeo(input.seo);
    c.pageSettings = validatePageSettings(input.pageSettings);
    return { ok: true, content: c };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
export function getContent() {
  const result = validateContent(parse(read(KEYS.content)));
  return result.ok ? result.content : clone(defaultContent);
}
export function saveContent(content) {
  const result = validateContent(content);
  if (!result.ok) throw new Error(result.error);
  write(KEYS.content, result.content);
  return clone(result.content);
}
// Геттеры/сеттеры для отдельных секций
export function getHero() {
  return getContent().hero;
}
export function saveHero(hero) {
  const content = getContent();
  content.hero = validateHero(hero);
  return saveContent(content);
}
export function getFooter() {
  return getContent().footer;
}
export function saveFooter(footer) {
  const content = getContent();
  content.footer = validateFooter(footer);
  return saveContent(content);
}
export function getNavigation() {
  return getContent().navigation;
}
export function saveNavigation(nav) {
  const content = getContent();
  content.navigation = validateNavigation(nav);
  return saveContent(content);
}
export function getSeo() {
  return getContent().seo;
}
export function saveSeo(seo) {
  const content = getContent();
  content.seo = validateSeo(seo);
  return saveContent(content);
}
export function getPageSettings() {
  return getContent().pageSettings;
}
export function savePageSettings(ps) {
  const content = getContent();
  content.pageSettings = validatePageSettings(ps);
  return saveContent(content);
}
export function resetContent() {
  remove(KEYS.content);
  return clone(defaultContent);
}
export function exportData() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      products: getProducts(),
      content: getContent(),
    },
    null,
    2,
  );
}
export function importData(json) {
  try {
    const input = typeof json === 'string' ? JSON.parse(json) : json;
    if (!isObject(input) || input.version !== 1)
      return { ok: false, error: 'Ожидается резервная копия MOСРЕГСЕПТИК с version: 1.' };
    const products = validateProducts(input.products);
    if (!products.ok) return products;
    const content = validateContent(input.content);
    if (!content.ok) return content;
    // Проверяем обе части до записи, чтобы не принять частично повреждённый файл.
    write(KEYS.products, products.products);
    write(KEYS.content, content.content);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Некорректный JSON: ${error.message}` };
  }
}
export function resetAll() {
  resetProducts();
  resetContent();
}
export const formatPrice = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export const phoneHref = (value) => `tel:+${value.replace(/\D/g, '')}`;
